import { db } from "./db"
import { users, notificationPreferences } from "./schema"
import { eq } from "drizzle-orm"

const DEV_CHAT_ID = 7764382006

function botToken() {
  const t = process.env.TELEGRAM_BOT_TOKEN
  if (!t) throw new Error("Missing TELEGRAM_BOT_TOKEN")
  return t
}

export async function notifyDev(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: DEV_CHAT_ID,
        text: `⚠️ ${text}`,
        disable_web_page_preview: true,
      }),
    })
  } catch {
    // fail silently — don't crash the app
  }
}

export async function notifyError(context: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error)
  await notifyDev(`*${context}*\n\`${msg.slice(0, 500)}\``)
}

export async function getNotificationPrefs(userId: number) {
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .then((r) => r[0])
  return prefs ?? { likeEnabled: true, commentEnabled: true, followEnabled: true }
}

async function sendBotMessage(chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    })
  } catch {
    // fail silently
  }
}

export async function notifyUser(targetUserId: number, text: string) {
  const target = await db
    .select({ telegramId: users.telegramId })
    .from(users)
    .where(eq(users.id, targetUserId))
    .then((r) => r[0])
  if (!target) return
  await sendBotMessage(target.telegramId, text)
}
