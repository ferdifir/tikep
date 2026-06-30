import { NextResponse } from "next/server"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { db } from "@/app/lib/db"
import { users } from "@/app/lib/schema"
import { eq } from "drizzle-orm"

export async function PUT(req: Request) {
  try {
    const { initData, price, active } = await req.json()
    if (!initData) return NextResponse.json({ error: "Missing initData" }, { status: 401 })

    const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (!tgData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tgUser = extractUser(tgData)
    if (!tgUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const creator = await findUser(tgUser)
    if (!creator) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const newPrice = Math.max(1, Math.min(10000, Math.round(price ?? 0)))
    const newActive = Boolean(active)

    await db
      .update(users)
      .set({ subscriptionPrice: newPrice, subscriptionActive: newActive })
      .where(eq(users.id, creator.id))

    return NextResponse.json({ ok: true, price: newPrice, active: newActive })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
