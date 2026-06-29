import { NextResponse } from "next/server"
import { db } from "@/app/lib/db"
import { users } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { eq, and, ne } from "drizzle-orm"

export async function PUT(request: Request) {
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

  const user = await findUser(tgUser)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const usernameClean = username.startsWith("@") ? username.slice(1) : username

  const taken = await db
    .select()
    .from(users)
    .where(and(eq(users.username, usernameClean), ne(users.id, user.id)))
    .then((r) => r[0])
  if (taken) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 })
  }

  const [updated] = await db
    .update(users)
    .set({
      username: usernameClean,
      fullName,
      bio: bio ?? "",
      ...(avatarUrl ? { avatarUrl } : {}),
    })
    .where(eq(users.id, user.id))
    .returning()

  return NextResponse.json({ user: updated })
}
