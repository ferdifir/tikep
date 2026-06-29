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
