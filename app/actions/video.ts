"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/app/lib/db"
import { videos, likes, comments, saves } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { eq } from "drizzle-orm"
import { unlink } from "fs/promises"
import path from "path"

export async function deleteVideo(videoId: number, initData: string) {
  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) throw new Error("Unauthorized")

  const tgUser = extractUser(tgData)
  if (!tgUser) throw new Error("Unauthorized")

  const user = await findUser(tgUser)
  if (!user) throw new Error("User not found")

  const video = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .then((r) => r[0])

  if (!video) throw new Error("Video not found")
  if (video.userId !== user.id) throw new Error("Forbidden")

  await db.delete(saves).where(eq(saves.videoId, videoId))
  await db.delete(likes).where(eq(likes.videoId, videoId))
  await db.delete(comments).where(eq(comments.videoId, videoId))
  await db.delete(videos).where(eq(videos.id, videoId))

  const filePath = path.join(process.cwd(), "public", video.filePath)
  try { await unlink(filePath) } catch {}
  if (video.thumbnailPath) {
    const thumbPath = path.join(process.cwd(), "public", video.thumbnailPath)
    try { await unlink(thumbPath) } catch {}
  }

  revalidatePath("/")
}
