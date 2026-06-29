import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users, videos, saves } from "@/app/lib/schema"
import { eq, desc } from "drizzle-orm"

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
    .from(saves)
    .innerJoin(videos, eq(saves.videoId, videos.id))
    .innerJoin(users, eq(videos.userId, users.id))
    .where(eq(saves.userId, Number(userId)))
    .orderBy(desc(saves.videoId))

  return NextResponse.json({ videos: rows })
}
