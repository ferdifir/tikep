"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/app/lib/db"
import { likes } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { and, eq } from "drizzle-orm"

export async function toggleLike(videoId: number, initData: string) {
  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) throw new Error("Unauthorized")

  const tgUser = extractUser(tgData)
  if (!tgUser) throw new Error("Unauthorized")

  const user = await findUser(tgUser)
  if (!user) throw new Error("User not found")

  const existing = await db
    .select()
    .from(likes)
    .where(
      and(
        eq(likes.userId, user.id),
        eq(likes.videoId, videoId),
      ),
    )
    .then((r) => r[0])

  if (existing) {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, user.id),
          eq(likes.videoId, videoId),
        ),
      )
  } else {
    await db.insert(likes).values({ userId: user.id, videoId })
  }

  revalidatePath("/")
}
