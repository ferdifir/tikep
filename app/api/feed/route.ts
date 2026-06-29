import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users, videos, likes, comments, saves, follows } from "@/app/lib/schema"
import { eq, desc, inArray } from "drizzle-orm"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import type { VideoWithUser } from "@/app/lib/types"

export const dynamic = "force-dynamic"

async function queryFeed(userId?: number) {
  let videoQuery = db
    .select({
      id: videos.id,
      caption: videos.caption,
      filePath: videos.filePath,
      duration: videos.duration,
      createdAt: videos.createdAt,
      userId: users.id,
      username: users.username,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      likeCount: db.$count(likes, eq(likes.videoId, videos.id)),
      commentCount: db.$count(comments, eq(comments.videoId, videos.id)),
      saveCount: db.$count(saves, eq(saves.videoId, videos.id)),
      shareCount: videos.shareCount,
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))

  if (userId) {
    const followingIds = await db
      .select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId))

    if (followingIds.length === 0) return []

    const ids = followingIds.map((f) => f.id)
    videoQuery = videoQuery.where(inArray(videos.userId, ids)) as typeof videoQuery
  }

  const rows = await videoQuery.orderBy(desc(videos.createdAt))

  return rows.map<VideoWithUser>((r) => ({
    id: r.id,
    caption: r.caption,
    filePath: r.filePath,
    duration: r.duration,
    createdAt: r.createdAt,
    userId: r.userId,
    username: r.username,
    fullName: r.fullName,
    avatarUrl: r.avatarUrl,
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    saveCount: r.saveCount,
    shareCount: r.shareCount,
  }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get("tab") ?? "for-you"
  const initData = searchParams.get("initData")

  if (tab === "following") {
    if (!initData) {
      return NextResponse.json({ feed: [], error: "Authentication required" }, { status: 401 })
    }

    const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (!tgData) {
      return NextResponse.json({ feed: [], error: "Unauthorized" }, { status: 401 })
    }

    const tgUser = extractUser(tgData)
    if (!tgUser) {
      return NextResponse.json({ feed: [], error: "Unauthorized" }, { status: 401 })
    }

    const user = await findUser(tgUser)
    if (!user) {
      return NextResponse.json({ feed: [], error: "User not found" }, { status: 404 })
    }

    const feed = await queryFeed(user.id)
    return NextResponse.json({ feed })
  }

  const feed = await queryFeed()
  return NextResponse.json({ feed })
}
