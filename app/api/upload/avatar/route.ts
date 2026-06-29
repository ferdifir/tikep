import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { db } from "@/app/lib/db"
import { users } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { eq } from "drizzle-orm"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("avatar") as File | null
  const initData = formData.get("initData") as string

  if (!file || !initData) {
    return NextResponse.json({ error: "Missing avatar or initData" }, { status: 400 })
  }

  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tgUser = extractUser(tgData)
  if (!tgUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP allowed" }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Max 5MB" }, { status: 400 })
  }

  const ext = path.extname(file.name) || ".jpg"
  const user = await findUser(tgUser)
  const filename = user
    ? `avatar_${user.id}${ext}`
    : `avatar_tg_${tgUser.id}_${Date.now()}${ext}`
  const dir = path.join(process.cwd(), "public", "avatars")
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, filename)

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  const avatarUrl = `/avatars/${filename}`

  if (user) {
    const [updated] = await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, user.id))
      .returning()
    return NextResponse.json({ user: updated, avatarUrl })
  }

  return NextResponse.json({ avatarUrl })
}
