import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { comments, users } from "@/app/lib/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params

  const rows = await db
    .select({
      id: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      userId: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.videoId, Number(videoId)))
    .orderBy(desc(comments.createdAt))

  return NextResponse.json({ comments: rows })
}
