import { NextResponse } from "next/server"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { db } from "@/app/lib/db"
import { subscriptions } from "@/app/lib/schema"
import { and, eq } from "drizzle-orm"

export async function POST(req: Request) {
  try {
    const { creatorId, initData } = await req.json()
    if (!creatorId || !initData) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (!tgData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tgUser = extractUser(tgData)
    if (!tgUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const subscriber = await findUser(tgUser)
    if (!subscriber) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const sub = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.subscriberId, subscriber.id),
          eq(subscriptions.creatorId, creatorId),
          eq(subscriptions.active, true),
        ),
      )
      .then((r) => r[0])

    if (!sub) return NextResponse.json({ error: "No active subscription" }, { status: 404 })

    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    await fetch(`https://api.telegram.org/bot${botToken}/editUserStarSubscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: subscriber.telegramId,
        telegram_payment_charge_id: sub.telegramPaymentChargeId,
        is_canceled: true,
      }),
    })

    await db
      .update(subscriptions)
      .set({ autoRenew: false })
      .where(eq(subscriptions.id, sub.id))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
