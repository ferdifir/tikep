import { NextResponse } from "next/server"
import { writeFile, mkdir, rm } from "fs/promises"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import ffprobe from "@ffprobe-installer/ffprobe"
import { db } from "@/app/lib/db"
import { videos } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { notifyError } from "@/app/lib/notify"

ffmpeg.setFfprobePath(ffprobe.path)
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg")

const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"]
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 100 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const caption = (formData.get("caption") as string) ?? ""
    const initData = formData.get("initData") as string

    if (!file || !initData) {
      return NextResponse.json({ error: "Missing file or initData" }, { status: 400 })
    }

    const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (!tgData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tgUser = extractUser(tgData)
    if (!tgUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await findUser(tgUser)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const isVideo = VIDEO_TYPES.includes(file.type)
  const isImage = IMAGE_TYPES.includes(file.type)

  if (!isVideo && !isImage) {
    return NextResponse.json({ error: "Only MP4, MOV, AVI, JPEG, PNG, WebP allowed" }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Max 100MB" }, { status: 400 })
  }

  const ext = path.extname(file.name) || (isVideo ? ".mp4" : ".jpg")
  const basename = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const dir = path.join(process.cwd(), "public", "uploads", String(user.id))

  await mkdir(dir, { recursive: true })

  const tempFile = path.join(dir, `temp_${basename}${ext}`)
  const bytes = await file.arrayBuffer()
  await writeFile(tempFile, Buffer.from(bytes))

  let duration = 0
  let finalFilename: string
  let finalPath: string
  let thumbnailPath: string | null = null

  if (isImage) {
    finalFilename = `${basename}.jpg`
    finalPath = path.join(dir, finalFilename)
    await writeFile(finalPath, Buffer.from(bytes))
    thumbnailPath = `/uploads/${user.id}/${finalFilename}`
  } else {
    duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tempFile, (err, metadata) => {
        if (err) reject(err)
        else resolve(metadata.format.duration ?? 0)
      })
    })

    if (duration > 30) {
      await rm(tempFile)
      return NextResponse.json({ error: "Max 30 seconds" }, { status: 400 })
    }

    finalFilename = `${basename}_comp.mp4`
    finalPath = path.join(dir, finalFilename)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempFile)
        .videoCodec("libx264")
        .size("?x720")
        .outputOptions(["-crf 28", "-preset fast", "-movflags +faststart"])
        .audioCodec("aac")
        .audioBitrate(64)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .save(finalPath)
    })

    await rm(tempFile)

    const thumbFilename = `${basename}.jpg`
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(finalPath)
          .screenshot({
            timestamps: [0],
            filename: thumbFilename,
            folder: dir,
          })
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
      })
      thumbnailPath = `/uploads/${user.id}/${thumbFilename}`
    } catch {
      // thumbnail optional
    }
  }

  const [video] = await db
    .insert(videos)
    .values({
      userId: user.id,
      caption,
      filePath: `/uploads/${user.id}/${finalFilename}`,
      thumbnailPath,
      duration: Math.round(duration),
    })
    .returning()

  return NextResponse.json({ video })
  } catch (e) {
    await notifyError("Upload failed", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
