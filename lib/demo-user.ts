import "server-only";
import { prisma } from "@/lib/prisma";

export async function getDemoUser() {
  return prisma.user.upsert({
    where: { telegramId: "demo-tikep-user" },
    update: {},
    create: {
      telegramId: "demo-tikep-user",
      username: "tikep_demo",
      firstName: "Tikep",
      lastName: "Studio",
      languageCode: "id",
    },
  });
}
