import { db } from "@/app/lib/db"
import { users, videos, likes, comments, saves } from "@/app/lib/schema"
import { eq, desc } from "drizzle-orm"
import { FeedPage } from "../components/feed-page"
import type { VideoWithUser } from "@/app/lib/types"

export const dynamic = "force-dynamic"

const LIMIT = 5

export default async function Home() {
  const rows = await db
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
    .orderBy(desc(videos.createdAt))
    .limit(LIMIT + 1)

  const hasMore = rows.length > LIMIT
  if (hasMore) rows.pop()

  const feed: VideoWithUser[] = rows.map((r) => ({
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

  const nextCursor = feed.length > 0
    ? Buffer.from(`0|${new Date(feed[feed.length - 1].createdAt!).toISOString()}`).toString("base64url")
    : null

  return <FeedPage initialFeed={feed} initialCursor={nextCursor} initialHasMore={hasMore} />
}
