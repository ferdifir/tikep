import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users, videos, likes, comments, saves, follows } from "@/app/lib/schema"
import { eq, desc, inArray, lt, sql } from "drizzle-orm"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import type { VideoWithUser } from "@/app/lib/types"

export const dynamic = "force-dynamic"

const DEFAULT_LIMIT = 5

function decodeCursor(raw: string): { score: number; createdAt: string } | null {
  try {
    const buf = Buffer.from(raw, "base64url")
    const str = buf.toString()
    const idx = str.indexOf("|")
    if (idx === -1) return null
    return { score: Number(str.slice(0, idx)), createdAt: str.slice(idx + 1) }
  } catch {
    return null
  }
}

function encodeCursor(score: number, createdAt: Date): string {
  return Buffer.from(`${score}|${createdAt.toISOString()}`).toString("base64url")
}

function mapRow(r: Record<string, unknown>): VideoWithUser {
  return {
    id: Number(r.id),
    caption: r.caption ? String(r.caption) : null,
    filePath: String(r.file_path),
    duration: r.duration ? Number(r.duration) : null,
    createdAt: r.created_at ? new Date(r.created_at as string) : null,
    userId: Number(r.user_id),
    username: r.username ? String(r.username) : null,
    fullName: r.full_name ? String(r.full_name) : null,
    avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
    likeCount: Number(r.like_count),
    commentCount: Number(r.comment_count),
    saveCount: Number(r.save_count),
    shareCount: Number(r.share_count),
  }
}

async function queryFeedPersonalized(
  currentUserId: number,
  cursor?: string,
  limit = DEFAULT_LIMIT,
) {
  const take = limit + 1

  const scoreExpr = sql`
    COALESCE((SELECT 50 FROM follows WHERE follower_id = ${currentUserId} AND following_id = v.user_id LIMIT 1), 0)
    +
    COALESCE((SELECT 25 FROM likes l JOIN videos v2 ON v2.id = l.video_id WHERE l.user_id = ${currentUserId} AND v2.user_id = v.user_id LIMIT 1), 0)
    +
    COALESCE((SELECT 25 FROM saves s JOIN videos v2 ON v2.id = s.video_id WHERE s.user_id = ${currentUserId} AND v2.user_id = v.user_id LIMIT 1), 0)
    +
    COALESCE((SELECT 20 FROM comments c JOIN videos v2 ON v2.id = c.video_id WHERE c.user_id = ${currentUserId} AND v2.user_id = v.user_id LIMIT 1), 0)
    +
    LEAST(
      COALESCE((SELECT COUNT(*) FROM likes WHERE likes.video_id = v.id), 0) * 0.5
      +
      COALESCE((SELECT COUNT(*) FROM comments WHERE comments.video_id = v.id), 0) * 0.3
      +
      COALESCE((SELECT COUNT(*) FROM saves WHERE saves.video_id = v.id), 0) * 0.3
      +
      COALESCE(v.share_count, 0) * 0.2,
      10
    )
  `

  let cursorWhere = sql`TRUE`
  if (cursor) {
    const parsed = decodeCursor(cursor)
    if (parsed) {
      cursorWhere = sql`(personal_score < ${parsed.score} OR (personal_score = ${parsed.score} AND created_at < ${new Date(parsed.createdAt)}))`
    }
  }

  const result = await db.execute(sql`
    WITH scored AS (
      SELECT
        v.id, v.caption, v.file_path, v.duration, v.created_at, v.share_count,
        u.id AS user_id, u.username, u.full_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE likes.video_id = v.id)::int AS like_count,
        (SELECT COUNT(*) FROM comments WHERE comments.video_id = v.id)::int AS comment_count,
        (SELECT COUNT(*) FROM saves WHERE saves.video_id = v.id)::int AS save_count,
        ${scoreExpr} AS personal_score
      FROM videos v
      JOIN users u ON u.id = v.user_id
    )
    SELECT * FROM scored
    WHERE ${cursorWhere}
    ORDER BY personal_score DESC, created_at DESC
    LIMIT ${take}
  `)

  const rawData = result.rows as Record<string, unknown>[]
  const hasMore = rawData.length > limit
  if (hasMore) rawData.pop()

  const feed = rawData.map(mapRow)
  const lastScore = rawData.length > 0 ? Number((rawData[rawData.length - 1] as Record<string, unknown>).personal_score ?? 0) : 0
  const nextCursor =
    feed.length > 0
      ? encodeCursor(lastScore, new Date(feed[feed.length - 1].createdAt!))
      : null

  return { feed, hasMore, nextCursor }
}

async function queryFeedChronological(
  onlyFollowed?: boolean,
  currentUserId?: number,
  cursor?: string,
  limit = DEFAULT_LIMIT,
) {
  const baseSelect = {
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
  }

  let q = db.select(baseSelect).from(videos).innerJoin(users, eq(videos.userId, users.id))

  if (onlyFollowed) {
    if (!currentUserId) return { feed: [], hasMore: false, nextCursor: null }

    const followingIds = await db
      .select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, currentUserId))

    if (followingIds.length === 0) return { feed: [], hasMore: false, nextCursor: null }

    q = q.where(inArray(videos.userId, followingIds.map((f) => f.id))) as typeof q
  }

  q = q.orderBy(desc(videos.createdAt)) as typeof q

  if (cursor) {
    const parsed = decodeCursor(cursor)
    if (parsed) {
      q = q.where(lt(videos.createdAt, new Date(parsed.createdAt))) as typeof q
    }
  }

  const take = limit + 1
  const rows = await (q as typeof q).limit(take)

  const hasMore = rows.length > limit
  if (hasMore) rows.pop()

  const feed = rows.map((r) => ({
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

  const nextCursor =
    feed.length > 0 ? encodeCursor(0, new Date(feed[feed.length - 1].createdAt!)) : null

  return { feed, hasMore, nextCursor }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get("tab") ?? "for-you"
  const initData = searchParams.get("initData")
  const cursor = searchParams.get("cursor") || undefined
  const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 20)

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

    const result = await queryFeedPersonalized(user.id, cursor, limit)
    return NextResponse.json(result)
  }

  if (initData) {
    const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (tgData) {
      const tgUser = extractUser(tgData)
      if (tgUser) {
        const user = await findUser(tgUser)
        if (user) {
          const result = await queryFeedPersonalized(user.id, cursor, limit)
          return NextResponse.json(result)
        }
      }
    }
  }

  const result = await queryFeedChronological(false, undefined, cursor, limit)
  return NextResponse.json(result)
}
