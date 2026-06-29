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

  const chatId = tgData.chat?.id ?? tgUser.id

  const [video] = await db
    .select({
      id: videos.id,
      caption: videos.caption,
      filePath: videos.filePath,
      userId: users.id,
      username: users.username,
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))
    .where(eq(videos.id, videoId))
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const me = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
  ).then((r) => r.json())

  const botUsername = me.result?.username
  if (!botUsername) {
    return NextResponse.json({ error: "Bot username not found" }, { status: 500 })
  }

  const watchUrl = `${process.env.NEXT_PUBLIC_URL}/watch/${video.id}`
  const username = video.username ?? `@user_${video.userId}`
  const caption = video.caption ?? ""

  const text = [
    `🎬 ${username}`,
    caption ? `\n${caption}` : "",
  ].join("")

  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: [[
            { text: "🎬 Open Video", web_app: { url: watchUrl } },
          ]],
        },
      }),
    },
  )

  const data = await res.json()
  if (!data.ok) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }

  await db
    .update(videos)
    .set({ shareCount: sql`${videos.shareCount} + 1` })
    .where(eq(videos.id, videoId))

  return NextResponse.json({ ok: true, botUsername })
}
