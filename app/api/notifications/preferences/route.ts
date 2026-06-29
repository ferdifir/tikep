import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { notificationPreferences } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { eq } from "drizzle-orm"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const initData = searchParams.get("initData")
  if (!initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 })
  }

  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tgUser = extractUser(tgData)
  if (!tgUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await findUser(tgUser)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id))
    .then((r) => r[0])

  return NextResponse.json({
    likeEnabled: prefs?.likeEnabled ?? true,
    commentEnabled: prefs?.commentEnabled ?? true,
    followEnabled: prefs?.followEnabled ?? true,
  })
}

export async function PUT(request: Request) {
  const { initData, likeEnabled, commentEnabled, followEnabled } = await request.json()
  if (!initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 })
  }

  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tgUser = extractUser(tgData)
  if (!tgUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await findUser(tgUser)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await db
    .insert(notificationPreferences)
    .values({
      userId: user.id,
      likeEnabled: likeEnabled ?? true,
      commentEnabled: commentEnabled ?? true,
      followEnabled: followEnabled ?? true,
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        likeEnabled: likeEnabled ?? true,
        commentEnabled: commentEnabled ?? true,
        followEnabled: followEnabled ?? true,
      },
    })

  return NextResponse.json({ ok: true })
}
