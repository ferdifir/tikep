import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users, videos, likes } from "@/app/lib/schema"
import { eq, desc, sql } from "drizzle-orm"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params

  const rows = await db
    .select({
      id: videos.id,
      caption: videos.caption,
      filePath: videos.filePath,
      thumbnailPath: videos.thumbnailPath,
      duration: videos.duration,
      createdAt: videos.createdAt,
      userId: users.id,
      username: users.username,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(videos)
    .innerJoin(users, eq(videos.userId, users.id))
    .where(eq(videos.userId, Number(userId)))
    .orderBy(desc(videos.createdAt))

  return NextResponse.json({ videos: rows })
}
