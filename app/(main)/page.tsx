import { db } from "@/app/lib/db"
import { users, videos, likes, comments, saves } from "@/app/lib/schema"
import { eq, desc } from "drizzle-orm"
import { FeedItem } from "../components/feed-item"
import type { VideoWithUser } from "@/app/lib/types"

export const dynamic = "force-dynamic"

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

  if (feed.length === 0) {
    return (
      <div className="h-[calc(100dvh-56px)] w-full flex items-center justify-center bg-black text-zinc-500">
        <p className="text-sm">No videos yet. Upload the first one!</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-56px)] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none">
      {feed.map((item) => (
        <FeedItem key={item.id} video={item} />
      ))}
    </div>
  )
}
