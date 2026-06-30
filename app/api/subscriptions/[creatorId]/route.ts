import { NextResponse } from "next/server"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { db } from "@/app/lib/db"
import { subscriptions, users } from "@/app/lib/schema"
import { and, eq } from "drizzle-orm"

export async function GET(req: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  try {
    const { creatorId } = await params
    const url = new URL(req.url)
    const initData = url.searchParams.get("initData")
    if (!initData) return NextResponse.json({ subscribed: false })

    const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (!tgData) return NextResponse.json({ subscribed: false })

    const tgUser = extractUser(tgData)
    if (!tgUser) return NextResponse.json({ subscribed: false })

    const user = await findUser(tgUser)
    if (!user) return NextResponse.json({ subscribed: false })

    const sub = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.subscriberId, user.id),
          eq(subscriptions.creatorId, Number(creatorId)),
          eq(subscriptions.active, true),
        ),
      )
      .then((r) => r[0])

    const creator = await db
      .select({
        subscriptionPrice: users.subscriptionPrice,
        subscriptionActive: users.subscriptionActive,
        subscriberCount: users.subscriberCount,
      })
      .from(users)
      .where(eq(users.id, Number(creatorId)))
      .then((r) => r[0])

    return NextResponse.json({
      subscribed: !!sub && new Date(sub.endDate) > new Date(),
      subscriptionPrice: creator?.subscriptionPrice ?? null,
      subscriptionActive: creator?.subscriptionActive ?? false,
      subscriberCount: creator?.subscriberCount ?? 0,
    })
  } catch {
    return NextResponse.json({ subscribed: false })
  }
}
