import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users } from "@/app/lib/schema"
import { validateInitData, extractUser } from "@/app/lib/tg"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  const { initData } = await request.json()
  if (!initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 })
  }

  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tgUser = extractUser(tgData)
  if (!tgUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      bio: users.bio,
    })
    .from(users)
    .where(eq(users.telegramId, tgUser.id))
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const profileUrl = `${process.env.NEXT_PUBLIC_URL}/@${user.username ?? `user_${user.id}`}`
  const displayName = user.fullName ?? user.username ?? `User ${user.id}`
  const bio = user.bio ?? ""

  const shareText = [
    `👤 ${displayName}`,
    bio ? `\n${bio}` : "",
    `\n\n🔗 ${profileUrl}`,
  ].join("")

  return NextResponse.json({ ok: true, shareText })
}
