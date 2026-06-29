"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/app/lib/db"
import { users, follows } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { and, eq } from "drizzle-orm"
import { notifyUser, getNotificationPrefs } from "@/app/lib/notify"

export async function toggleFollow(username: string, initData: string) {
  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) throw new Error("Unauthorized")

  const tgUser = extractUser(tgData)
  if (!tgUser) throw new Error("Unauthorized")

  const current = await findUser(tgUser)
  if (!current) throw new Error("User not found")

  const target = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .then((r) => r[0])

  if (!target || target.id === current.id) throw new Error("User not found")

  const existing = await db
    .select()
    .from(follows)
    .where(
      and(
        eq(follows.followerId, current.id),
        eq(follows.followingId, target.id),
      ),
    )
    .then((r) => r[0])

  if (existing) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, current.id),
          eq(follows.followingId, target.id),
        ),
      )
  } else {
    await db.insert(follows).values({ followerId: current.id, followingId: target.id })

    const prefs = await getNotificationPrefs(target.id)
    if (prefs.followEnabled) {
      await notifyUser(target.id, `👥 ${current.fullName ?? current.username ?? "Someone"} started following you`)
    }
  }

  revalidatePath(`/@${username}`)
  revalidatePath("/")
}
