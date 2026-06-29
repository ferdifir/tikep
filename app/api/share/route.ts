import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { videos, users } from "@/app/lib/schema"
import { validateInitData, extractUser } from "@/app/lib/tg"
import { eq, sql } from "drizzle-orm"

export async function POST(request: Request) {
  const { videoId, initData } = await request.json()
  if (!videoId || !initData) {
    return NextResponse.json({ error: "Missing videoId or initData" }, { status: 400 })
  }

  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tgUser = extractUser(tgData)
  if (!tgUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [video] = await db
    .select({
      id: videos.id,
      caption: videos.caption,
      userId: users.id,
      username: users.username,
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))
    .where(eq(videos.id, videoId))
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const watchUrl = `${process.env.NEXT_PUBLIC_URL}/watch/${video.id}`
  const username = video.username ?? `@user_${video.userId}`
  const caption = video.caption ?? ""

  const shareText = [
    `🎬 ${username}`,
    caption ? `\n${caption}` : "",
    `\n\n🔗 ${watchUrl}`,
  ].join("")

  await db
    .update(videos)
    .set({ shareCount: sql`${videos.shareCount} + 1` })
    .where(eq(videos.id, videoId))

  return NextResponse.json({ ok: true, shareText })
}
