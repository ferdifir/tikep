import "server-only";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { validateTelegramInitData } from "@/lib/telegram-auth";

export async function getUserFromInitDataOrDemo(initData?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (initData && botToken) {
    const validated = validateTelegramInitData(initData, botToken);

    return prisma.user.upsert({
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
  }

  return getDemoUser();
}
