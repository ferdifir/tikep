import { NextResponse } from "next/server"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { db } from "@/app/lib/db"
import { users } from "@/app/lib/schema"
import { eq } from "drizzle-orm"

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

    if (subscriber.id === creatorId) {
      return NextResponse.json({ error: "Cannot subscribe to yourself" }, { status: 400 })
    }

    const creator = await db
      .select()
      .from(users)
      .where(eq(users.id, creatorId))
      .then((r) => r[0])

    if (!creator || !creator.subscriptionActive || !creator.subscriptionPrice) {
      return NextResponse.json({ error: "Creator has no active subscription plan" }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    const payload = JSON.stringify({ subscriberId: subscriber.id, creatorId })

    const res = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Tikep Subscription — @${creator.username ?? creator.fullName ?? "Creator"}`,
        description: `Monthly subscription to ${creator.fullName ?? creator.username}`,
        payload,
        provider_token: "",
        currency: "XTR",
        prices: [{ label: "1 month", amount: creator.subscriptionPrice }],
      }),
    })

    const data = await res.json()
    if (!data.ok || !data.result) {
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
    }

    return NextResponse.json({ invoiceUrl: data.result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
