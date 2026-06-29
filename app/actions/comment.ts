"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/app/lib/db"
import { comments, videos } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"
import { eq } from "drizzle-orm"
import { notifyUser, getNotificationPrefs } from "@/app/lib/notify"

export async function addComment(videoId: number, text: string, initData: string) {
  const tgData = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
  if (!tgData) throw new Error("Unauthorized")

  const tgUser = extractUser(tgData)
  if (!tgUser) throw new Error("Unauthorized")

  const user = await findUser(tgUser)
  if (!user) throw new Error("User not found")

  await db.insert(comments).values({
    userId: user.id,
    videoId,
    text,
  })

  const video = await db
    .select({ userId: videos.userId })
    .from(videos)
    .where(eq(videos.id, videoId))
    .then((r) => r[0])
  if (video && video.userId !== user.id) {
    const prefs = await getNotificationPrefs(video.userId)
    if (prefs.commentEnabled) {
      await notifyUser(video.userId, `💬 ${user.fullName ?? user.username ?? "Someone"} commented: ${text.slice(0, 80)}`)
    }
  }

  revalidatePath("/")
  revalidatePath(`/watch/${videoId}`)
}
