import { NextResponse } from "next/server"
import { groqChat } from "@/app/lib/groq"
import { checkText, checkRateLimit, sanitizeOutput } from "@/app/lib/bot-guard"
import { buildRagContext } from "@/app/lib/bot-rag"
import { notifyDev, notifyError } from "@/app/lib/notify"
import { db } from "@/app/lib/db"
import { users, subscriptions } from "@/app/lib/schema"
import { eq, and, sql } from "drizzle-orm"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TG_SEND = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
const TG_CHAT = `https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`

const REPORT_PATTERNS = [
  /(^|\s)(bug|lapor|report|error|eror|rusak|gagal|failed|broken|problem|masalah)(\s|[.!?,]|$)/i,
  /(^|\s)(fitur|feature|request|saran|minta|tambah|add|idea|usul)(\s|[.!?,]|$)/i,
]

function isReport(text: string): boolean {
  return REPORT_PATTERNS.some((p) => p.test(text))
}

const SYSTEM_PROMPT = `You are a helpful assistant for Tikep, a TikTok-like short video platform inside Telegram.

You help users find videos, learn about the platform, and get recommendations.

Rules:
- Keep answers short and friendly (max 3 sentences when possible)
- Do not generate harmful, offensive, or misleading content
- Do not impersonate other users or services
- If asked about something outside the platform, politely redirect
- If you don't know something, say so honestly
- Use Indonesian or English matching the user's language
- If a user wants to report a bug or request a feature, they will be handled separately — just acknowledge and thank them`

interface Exchange {
  role: "user" | "assistant"
  content: string
}

const conversations = new Map<number, Exchange[]>()
const MAX_HISTORY = 5

function getHistory(chatId: number): Exchange[] {
  return conversations.get(chatId) ?? []
}

function appendHistory(chatId: number, exchange: Exchange) {
  const h = getHistory(chatId)
  h.push(exchange)
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY)
  conversations.set(chatId, h)
}

function sendBotMessage(chatId: number, text: string) {
  return fetch(TG_SEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
}

export async function POST(request: Request) {
  const update = await request.json()

  if (update.pre_checkout_query) {
    const pq = update.pre_checkout_query
    try {
      const payload = JSON.parse(pq.invoice_payload)
      const subscriberId = payload.subscriberId
      const creatorId = payload.creatorId
      if (typeof subscriberId !== "number" || typeof creatorId !== "number") {
        throw new Error("Invalid payload")
      }
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: pq.id, ok: true }),
      })
    } catch {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: pq.id, ok: false, error_message: "Invalid payment" }),
      })
    }
    return NextResponse.json({ ok: true })
  }

  const msg = update.message

  if (msg?.successful_payment) {
    try {
      const payload = JSON.parse(msg.successful_payment.invoice_payload)
      const subscriberId = payload.subscriberId
      const creatorId = payload.creatorId
      const chargeId = msg.successful_payment.telegram_payment_charge_id

      const now = new Date()
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const existing = await db
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.subscriberId, subscriberId), eq(subscriptions.creatorId, creatorId)),
        )
        .then((r) => r[0])

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            active: true,
            autoRenew: true,
            endDate,
            telegramPaymentChargeId: chargeId,
          })
          .where(eq(subscriptions.id, existing.id))
      } else {
        await db.insert(subscriptions).values({
          subscriberId,
          creatorId,
          telegramPaymentChargeId: chargeId,
          startDate: now,
          endDate,
        })
      }

      const [creator, subscriber] = await Promise.all([
        db.select().from(users).where(eq(users.id, creatorId)).then((r) => r[0]),
        db.select().from(users).where(eq(users.id, subscriberId)).then((r) => r[0]),
      ])

      await db
        .update(users)
        .set({
          subscriberCount: sql`${users.subscriberCount} + 1`,
        })
        .where(eq(users.id, creatorId))

      if (subscriber) {
        await sendBotMessage(subscriber.telegramId, `You are now subscribed to @${creator?.username ?? creator?.fullName ?? "Creator"}! 🎉`)
      }
      if (creator) {
        await sendBotMessage(creator.telegramId, `🌟 @${subscriber?.username ?? subscriber?.fullName ?? "Someone"} subscribed to you!`)
      }
    } catch (e) {
      await notifyError("Subscription payment callback error", e)
    }
    return NextResponse.json({ ok: true })
  }

  if (!msg?.text || !msg.from) {
    return NextResponse.json({ ok: true })
  }

  const userId = msg.from.id
  const chatId = msg.chat.id
  const text = msg.text

  if (text === "/start" || text === "/help") {
    await fetch(TG_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🎬 *Tikep*\n\nShort videos inside Telegram.\n\nTap the button below to open the app!",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "🚀 Open Tikep", web_app: { url: process.env.NEXT_PUBLIC_URL! } },
          ]],
        },
      }),
    })
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith("/start ")) {
    const param = text.slice(7).trim()
    if (param.startsWith("video_")) {
      const videoId = param.replace("video_", "")
      await fetch(TG_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🎬 Check out this video!",
          reply_markup: {
            inline_keyboard: [[
              { text: "🎬 Open Video", web_app: { url: `${process.env.NEXT_PUBLIC_URL}/watch/${videoId}` } },
            ]],
          },
        }),
      })
    }
    return NextResponse.json({ ok: true })
  }

  const textErr = checkText(text)
  if (textErr) {
    await fetch(TG_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: textErr }),
    })
    return NextResponse.json({ ok: true })
  }

  const rateErr = checkRateLimit(userId)
  if (rateErr) {
    await fetch(TG_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: rateErr }),
    })
    return NextResponse.json({ ok: true })
  }

  try {
    await fetch(TG_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    })
  } catch {
    // non-critical
  }

  if (isReport(text)) {
    const userInfo = msg.from.username
      ? `@${msg.from.username}`
      : `${msg.from.first_name ?? ""} ${msg.from.last_name ?? ""}`.trim() || `#${msg.from.id}`
    await notifyDev(`📬 *Laporan dari ${userInfo}*\n\n${text}`)
    await fetch(TG_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Terima kasih! Laporan kamu sudah diteruskan ke pengembang 🫡",
      }),
    })
    return NextResponse.json({ ok: true })
  }

  const ctx = await buildRagContext(text)

  let ragBlock = ""
  if (ctx.relevantUsers.length > 0) {
    ragBlock += "\nRelevant users:\n" + ctx.relevantUsers
      .map((u) => `  - @${u.username} (${u.fullName ?? "?"}): ${u.bio ?? ""}`)
      .join("\n")
  }
  if (ctx.relevantVideos.length > 0) {
    ragBlock += "\nRelevant videos:\n" + ctx.relevantVideos
      .map((v) => `  - "${v.caption ?? "(no caption)"}" (${v.duration ?? 0}s)`)
      .join("\n")
  }
  ragBlock += `\n\nPlatform stats: ${ctx.stats.totalUsers} users, ${ctx.stats.totalVideos} videos`

  const historyMessages = getHistory(chatId).map((h) => ({
    role: h.role,
    content: h.content,
  }))

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT + "\n\nCurrent context:" + ragBlock },
    ...historyMessages,
    { role: "user" as const, content: text },
  ]

  try {
    const reply = await groqChat(messages)
    const clean = sanitizeOutput(reply)

    appendHistory(chatId, { role: "user", content: text })
    appendHistory(chatId, { role: "assistant", content: clean })

    await fetch(TG_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: clean }),
    })
  } catch (e) {
    await notifyError("Bot chat error", e)
    await fetch(TG_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Sorry, I'm having trouble thinking right now. Try again later." }),
    })
  }

  return NextResponse.json({ ok: true })
}
