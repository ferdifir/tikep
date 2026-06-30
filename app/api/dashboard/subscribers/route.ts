import { NextResponse } from "next/server"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { db } from "@/app/lib/db"
import { users, subscriptions } from "@/app/lib/schema"
import { eq, and, sql, desc } from "drizzle-orm"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const initData = url.searchParams.get("initData")
    if (!initData) return NextResponse.json({ error: "Missing initData" }, { status: 401 })

    const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (!tgData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tgUser = extractUser(tgData)
    if (!tgUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const creator = await findUser(tgUser)
    if (!creator) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const rows = await db
      .select({
        id: subscriptions.id,
        subscriberId: subscriptions.subscriberId,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        active: subscriptions.active,
        username: users.username,
        fullName: users.fullName,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.subscriberId, users.id))
      .where(eq(subscriptions.creatorId, creator.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(100)

    return NextResponse.json({ subscribers: rows })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
