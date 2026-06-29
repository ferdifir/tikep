import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { follows } from "@/app/lib/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params

  const [followerCount, followingCount] = await Promise.all([
    db.$count(follows, eq(follows.followingId, Number(userId))),
    db.$count(follows, eq(follows.followerId, Number(userId))),
  ])

  return NextResponse.json({ followerCount, followingCount })
}
