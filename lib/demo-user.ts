import "server-only";
import { prisma } from "@/lib/prisma";

export async function getDemoUser() {
  return prisma.user.upsert({
    where: { telegramId: "demo-tikep-user" },
    update: {
      telegramChatId: "demo-tikep-chat",
      botStartedAt: new Date(),
    },
    create: {
      telegramId: "demo-tikep-user",
      telegramChatId: "demo-tikep-chat",
      botStartedAt: new Date(),
      username: "tikep_demo",
      firstName: "Tikep",
      lastName: "Studio",
      languageCode: "id",
    },
  });
}
