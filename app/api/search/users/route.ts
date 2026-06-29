import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users, follows } from "@/app/lib/schema"
import { validateInitData, extractUser } from "@/app/lib/tg"
import { eq, or, like } from "drizzle-orm"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const initData = searchParams.get("initData")

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

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] })
  }

  const pattern = `%${q}%`
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      followerCount: db.$count(follows, eq(follows.followingId, users.id)),
    })
    .from(users)
    .where(
      or(
        like(users.username, pattern),
        like(users.fullName, pattern),
      ),
    )
    .limit(20)

  return NextResponse.json({ users: rows })
}
