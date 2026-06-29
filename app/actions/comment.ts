"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/app/lib/db"
import { comments } from "@/app/lib/schema"
import { validateInitData, extractUser, findUser } from "@/app/lib/tg"

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

  revalidatePath("/")
}
