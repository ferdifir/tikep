import "server-only";

export async function sendTelegramMessage(input: {
  chatId: string;
  text: string;
  replyMarkup?: unknown;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { status: "not_configured" as const };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text,
      reply_markup: input.replyMarkup,
    }),
  });

  if (!response.ok) {
    return { status: "failed" as const };
  }

  const data = (await response.json().catch(() => ({}))) as { result?: { message_id?: number } };
  return { status: "sent" as const, messageId: data.result?.message_id ?? null };
}

export async function answerTelegramCallbackQuery(input: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { status: "not_configured" as const };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: input.callbackQueryId,
      text: input.text,
      show_alert: input.showAlert,
    }),
  });

  if (!response.ok) {
    return { status: "failed" as const };
  }

  return { status: "sent" as const };
}

export async function sendTelegramPhoto(input: {
  chatId: string;
  photoDataUrl: string;
  caption?: string;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { status: "not_configured" as const };
  }

  const [, base64Data = ""] = input.photoDataUrl.split(",");
  const imageBuffer = Buffer.from(base64Data, "base64");
  const form = new FormData();
  form.append("chat_id", input.chatId);
  form.append("photo", new Blob([imageBuffer], { type: "image/png" }), "tikep-qris.png");

  if (input.caption) {
    form.append("caption", input.caption);
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    return { status: "failed" as const };
  }

  return { status: "sent" as const };
}
