import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  const { initData, username, fullName, bio, avatarUrl } = await request.json()
  if (!initData || !username || !fullName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tgUser = extractUser(tgData)
  if (!tgUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await findUser(tgUser)
  if (existing) {
    return NextResponse.json({ error: "Already registered" }, { status: 400 })
  }

  const usernameClean = username.startsWith("@") ? username : `@${username}`

  const taken = await db
    .select()
    .from(users)
    .where(eq(users.username, usernameClean))
    .then((r) => r[0])
  if (taken) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 })
  }

  const [user] = await db
    .insert(users)
    .values({
      telegramId: tgUser.id,
      telegramUsername: tgUser.username ?? null,
      username: usernameClean,
      fullName,
      bio: bio ?? "",
      avatarUrl: avatarUrl ?? tgUser.photo_url ?? null,
    })
    .returning()

  return NextResponse.json({ user })
}
