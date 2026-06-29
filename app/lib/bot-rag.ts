import { db } from "./db"
import { videos, users } from "./schema"
import { ilike, desc, eq, and, or, sql } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

type User = InferSelectModel<typeof users>
type Video = InferSelectModel<typeof videos>

export interface RagContext {
  relevantUsers: Pick<User, "username" | "fullName" | "bio">[]
  relevantVideos: Pick<Video, "caption" | "filePath" | "duration">[]
  stats: {
    totalUsers: number
    totalVideos: number
  }
}

export async function buildRagContext(text: string): Promise<RagContext> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)

  const pattern = words.map((w) => `%${w}%`)

  const searchUsers = pattern.length > 0
  const searchVideos = pattern.length > 0

  const [userRows, videoRows, totalUsers, totalVideos] = await Promise.all([
    searchUsers
      ? db
          .select({ username: users.username, fullName: users.fullName, bio: users.bio })
          .from(users)
          .where(
            or(
              ...pattern.map((p) => ilike(users.username, p)),
              ...pattern.map((p) => ilike(users.fullName, p)),
              ...pattern.map((p) => ilike(users.bio, p)),
            ),
          )
          .limit(5)
      : Promise.resolve([]),

    searchVideos
      ? db
          .select({ caption: videos.caption, filePath: videos.filePath, duration: videos.duration })
          .from(videos)
          .where(or(...pattern.map((p) => ilike(videos.caption, p))))
          .limit(5)
      : Promise.resolve([]),

    db.select({ count: sql<number>`count(*)` }).from(users).then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` }).from(videos).then((r) => Number(r[0]?.count ?? 0)),
  ])

  return {
    relevantUsers: userRows,
    relevantVideos: videoRows,
    stats: { totalUsers, totalVideos },
  }
}
