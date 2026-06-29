import { NextResponse } from "next/server"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"

export async function POST(request: Request) {
  const { initData } = await request.json()
  if (!initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 })
  }

  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) {
    return NextResponse.json({ error: "Invalid initData" }, { status: 401 })
  }

  const tgUser = extractUser(tgData)
  if (!tgUser) {
    return NextResponse.json({ error: "No user in initData" }, { status: 400 })
  }

  const user = await findUser(tgUser)
  if (!user) {
    return NextResponse.json({
      needsOnboarding: true,
      tgUser: {
        id: tgUser.id,
        username: tgUser.username ?? null,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        photoUrl: tgUser.photo_url ?? null,
      },
    })
  }

  return NextResponse.json({ user })
}
