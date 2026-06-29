"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/app/lib/db"
import { saves } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { and, eq } from "drizzle-orm"

export async function toggleSave(videoId: number, initData: string) {
  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) throw new Error("Unauthorized")

  const tgUser = extractUser(tgData)
  if (!tgUser) throw new Error("Unauthorized")

  const user = await findUser(tgUser)
  if (!user) throw new Error("User not found")

  const existing = await db
    .select()
    .from(saves)
    .where(
      and(
        eq(saves.userId, user.id),
        eq(saves.videoId, videoId),
      ),
    )
    .then((r) => r[0])

  if (existing) {
    await db
      .delete(saves)
      .where(
        and(
          eq(saves.userId, user.id),
          eq(saves.videoId, videoId),
        ),
      )
  } else {
    await db.insert(saves).values({ userId: user.id, videoId })
  }

  revalidatePath("/")
}
