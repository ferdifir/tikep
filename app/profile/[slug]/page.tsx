import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/app/lib/db"
import { users, videos, follows } from "@/app/lib/schema"
import { eq, desc, sql } from "drizzle-orm"
import OwnVideoGrid from "@/app/components/own-video-grid"

export const dynamic = "force-dynamic"

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let user = await db
    .select()
    .from(users)
    .where(eq(users.username, `@${slug}`))
    .then((r) => r[0])

  if (!user && slug.startsWith("user_")) {
    const id = Number(slug.replace("user_", ""))
    if (!isNaN(id)) {
      user = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .then((r) => r[0])
    }
  }

  if (!user) notFound()

  const userVideos = await db
    .select()
    .from(videos)
    .where(eq(videos.userId, user.id))
    .orderBy(desc(videos.createdAt))

  const [followerCount, followingCount] = await Promise.all([
    db.$count(follows, eq(follows.followingId, user.id)),
    db.$count(follows, eq(follows.followerId, user.id)),
  ])

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="h-16 bg-zinc-900 flex items-center justify-between px-4">
        <Link href="/" className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
      </div>

      <div className="px-4 pb-6 flex justify-between items-start gap-4 mt-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{user.fullName ?? "User"}</h1>
          <p className="text-zinc-400 text-sm">{user.username}</p>
          <p className="text-white/80 text-sm mt-1">{user.bio || "No bio yet"}</p>
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold">{followingCount}</p>
              <p className="text-xs text-zinc-400">Following</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{followerCount}</p>
              <p className="text-xs text-zinc-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{userVideos.length}</p>
              <p className="text-xs text-zinc-400">Posts</p>
            </div>
          </div>
        </div>
        <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden border-4 border-black">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-white text-3xl font-bold">
              {(user.fullName ?? "U")[0]}
            </div>
          )}
        </div>
      </div>

      <div className="px-1 border-t border-zinc-800 pt-1">
        <OwnVideoGrid videos={userVideos} profileUserId={user.id} />
      </div>
    </div>
  )
}
