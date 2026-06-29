import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { likes, saves, follows } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { and, eq, inArray } from "drizzle-orm"

export async function POST(request: Request) {
  const { initData, videoIds, targetUserIds } = await request.json()
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

  const user = await findUser(tgUser)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const ids: number[] = Array.isArray(videoIds) ? videoIds : []
  const tids: number[] = Array.isArray(targetUserIds) ? targetUserIds : []

  const [likedRows, savedRows, followedRows] = await Promise.all([
    ids.length > 0
      ? db
          .select({ videoId: likes.videoId })
          .from(likes)
          .where(and(eq(likes.userId, user.id), inArray(likes.videoId, ids)))
      : Promise.resolve([]),
    ids.length > 0
      ? db
          .select({ videoId: saves.videoId })
          .from(saves)
          .where(and(eq(saves.userId, user.id), inArray(saves.videoId, ids)))
      : Promise.resolve([]),
    tids.length > 0
      ? db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(and(eq(follows.followerId, user.id), inArray(follows.followingId, tids)))
      : Promise.resolve([]),
  ])

  return NextResponse.json({
    likes: likedRows.map((r) => r.videoId),
    saves: savedRows.map((r) => r.videoId),
    follows: followedRows.map((r) => r.followingId),
  })
}
