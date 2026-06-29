import Link from "next/link"
import { db } from "@/app/lib/db"
import { users, videos, likes, comments, saves } from "@/app/lib/schema"
import { eq } from "drizzle-orm"
import WatchVideo from "@/app/components/watch-video"

export const dynamic = "force-dynamic"

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [row] = await db
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
      likeCount: db.$count(likes, eq(likes.videoId, Number(id))),
      commentCount: db.$count(comments, eq(comments.videoId, Number(id))),
      saveCount: db.$count(saves, eq(saves.videoId, Number(id))),
      shareCount: videos.shareCount,
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))
    .where(eq(videos.id, Number(id)))

  if (!row) {
    return (
      <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-zinc-400 text-sm text-center">This video has been deleted or is no longer available.</p>
        <Link
          href="/"
          className="mt-2 px-6 py-2.5 rounded-xl bg-[--tg-button,#8774e1] text-white font-semibold text-sm"
        >
          Go Home
        </Link>
      </div>
    )
  }

  return <WatchVideo video={row} />
}
