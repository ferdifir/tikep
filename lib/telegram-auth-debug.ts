import "server-only";
import { isTelegramAuthDebugEnabled } from "@/lib/server-env";

type TelegramAuthDebugInput = {
  event: string;
  telegramId?: string | number | null;
  username?: string | null;
  authDate?: Date | null;
  expiresAt?: Date | null;
  hasTelegramChatId?: boolean;
  hasBotStartedAt?: boolean;
  error?: string;
};

export function logTelegramAuthDebug(input: TelegramAuthDebugInput) {
  if (!isTelegramAuthDebugEnabled()) {
    return;
  }

  console.info(
    JSON.stringify({
      scope: "telegram-auth",
      event: input.event,
      telegramId: input.telegramId ? String(input.telegramId) : null,
      username: input.username ?? null,
      authDate: input.authDate?.toISOString() ?? null,
      expiresAt: input.expiresAt?.toISOString() ?? null,
      hasTelegramChatId: input.hasTelegramChatId ?? null,
      hasBotStartedAt: input.hasBotStartedAt ?? null,
      error: input.error ?? null,
    }),
  );
}
