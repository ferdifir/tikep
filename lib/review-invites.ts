import "server-only";
import crypto from "node:crypto";

export function createReviewCode() {
  return crypto.randomBytes(18).toString("base64url");
}

export function hashReviewCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function getReviewUrls(requestUrl: string, code: string) {
  const origin = new URL(requestUrl).origin;
  const reviewUrl = `${origin}/review?code=${encodeURIComponent(code)}`;
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const telegramUrl = botUsername
    ? `https://t.me/${botUsername}?startapp=${encodeURIComponent(`review_${code}`)}`
    : null;

  return { reviewUrl, telegramUrl };
}

export async function sendReviewInviteMessage(input: {
  chatId: string;
  serviceTitle: string;
  reviewUrl: string;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { status: "not_configured" as const, error: "TELEGRAM_BOT_TOKEN belum dikonfigurasi." };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: `Silakan beri review untuk ${input.serviceTitle}.`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Beri Review",
              web_app: {
                url: input.reviewUrl,
              },
            },
          ],
        ],
      },
    }),
  });

  if (!response.ok) {
    return { status: "failed" as const, error: `Telegram sendMessage gagal: ${response.status}` };
  }

  return { status: "sent" as const, error: null };
}
