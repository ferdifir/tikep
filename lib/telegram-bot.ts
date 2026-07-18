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
