import { NextResponse } from "next/server"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { db } from "@/app/lib/db"
import { users, subscriptions } from "@/app/lib/schema"
import { eq, and, sql } from "drizzle-orm"

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

    const activeSubs = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.creatorId, creator.id),
          eq(subscriptions.active, true),
          sql`${subscriptions.endDate} > now()`,
        ),
      )
      .then((r) => r[0])

    return NextResponse.json({
      subscriberCount: activeSubs.count,
      subscriptionPrice: creator.subscriptionPrice,
      subscriptionActive: creator.subscriptionActive,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
