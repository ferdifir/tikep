"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/app/lib/db"
import { likes, videos } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { and, eq } from "drizzle-orm"
import { notifyUser, getNotificationPrefs } from "@/app/lib/notify"

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

    const video = await db
      .select({ userId: videos.userId })
      .from(videos)
      .where(eq(videos.id, videoId))
      .then((r) => r[0])
    if (video && video.userId !== user.id) {
      const prefs = await getNotificationPrefs(video.userId)
      if (prefs.likeEnabled) {
        await notifyUser(video.userId, `❤️ ${user.fullName ?? user.username ?? "Someone"} liked your video`)
      }
    }
  }

  revalidatePath("/")
  revalidatePath(`/watch/${videoId}`)
}
