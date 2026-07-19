import "server-only";
import { AuthenticationError } from "@/lib/auth-errors";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { validateTelegramInitData } from "@/lib/telegram-auth";
import { logTelegramAuthDebug } from "@/lib/telegram-auth-debug";

export function getInitDataFromRequestUrl(request: Request) {
  return new URL(request.url).searchParams.get("initData")?.trim() || undefined;
}

export async function getUserFromInitDataOrDemo(initData?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const isProduction = process.env.NODE_ENV === "production";

  if (initData && botToken) {
    const validated = validateTelegramInitData(initData, botToken);
    const expiresAt = new Date(validated.authDate.getTime() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.upsert({
      where: {
        telegramId: String(validated.user.id),
      },
      update: {
        username: validated.user.username,
        firstName: validated.user.first_name,
        lastName: validated.user.last_name,
        photoUrl: validated.user.photo_url,
        languageCode: validated.user.language_code,
      },
      create: {
        telegramId: String(validated.user.id),
        username: validated.user.username,
        firstName: validated.user.first_name,
        lastName: validated.user.last_name,
        photoUrl: validated.user.photo_url,
        languageCode: validated.user.language_code,
      },
    });

    logTelegramAuthDebug({
      event: "init_data_valid",
      telegramId: validated.user.id,
      username: validated.user.username,
      authDate: validated.authDate,
      expiresAt,
      hasTelegramChatId: Boolean(user.telegramChatId),
      hasBotStartedAt: Boolean(user.botStartedAt),
    });

    return user;
  }

  if (isProduction) {
    if (!botToken) {
      throw new AuthenticationError("TELEGRAM_BOT_TOKEN wajib dikonfigurasi di production.");
    }

    throw new AuthenticationError();
  }

  return getDemoUser();
}
