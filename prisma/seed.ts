import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";
import { seedServices } from "../lib/seed-data";
import { mediaCovers } from "../lib/service-utils";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const demoUser = await prisma.user.upsert({
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

  const categoryByName = new Map<string, string>();

  for (const name of ["Desain", "Marketing", "Teknologi", "Konten"]) {
    const category = await prisma.category.upsert({
      where: {
        createdByUserId_slug: {
          createdByUserId: demoUser.id,
          slug: slugify(name),
        },
      },
      update: {
        name,
        isSystem: true,
      },
      create: {
        createdByUserId: demoUser.id,
        slug: slugify(name),
        name,
        isSystem: true,
      },
    });
    categoryByName.set(name, category.id);
  }

  for (const service of seedServices) {
    const provider = await prisma.provider.upsert({
      where: { slug: slugify(service.provider) },
      update: {
        name: service.provider,
        avatar: service.avatar,
        avatarTone: service.avatarTone,
      },
      create: {
        ownerUserId: service.owner === "me" ? demoUser.id : null,
        slug: slugify(service.provider),
        name: service.provider,
        bio: "Penyedia produk dan jasa digital",
        avatar: service.avatar,
        avatarTone: service.avatarTone,
      },
    });

    const categoryId = categoryByName.get(service.category);

    if (!categoryId) {
      throw new Error(`Missing category ${service.category}`);
    }

    await prisma.service.upsert({
      where: { id: service.id },
      update: {
        providerId: provider.id,
        categoryId,
        title: service.title,
        price: service.price,
        ratingSnapshot: service.rating,
        description: service.description,
        iconName: service.iconName,
        previewLabel: service.previewLabel,
        ownerKind: service.owner,
        createdAt: new Date(`${service.createdAt}T00:00:00.000Z`),
      },
      create: {
        id: service.id,
        providerId: provider.id,
        categoryId,
        title: service.title,
        price: service.price,
        ratingSnapshot: service.rating,
        description: service.description,
        iconName: service.iconName,
        previewLabel: service.previewLabel,
        ownerKind: service.owner,
        createdAt: new Date(`${service.createdAt}T00:00:00.000Z`),
      },
    });

    const mediaIndex = seedServices.findIndex((item) => item.id === service.id);
    const existingMedia = await prisma.media.findFirst({
      where: {
        serviceId: service.id,
        sortOrder: 0,
      },
    });

    if (existingMedia) {
      await prisma.media.update({
        where: { id: existingMedia.id },
        data: {
          providerId: provider.id,
          type: mediaIndex % 3 === 1 ? "VIDEO" : "PHOTO",
          url: mediaCovers[mediaIndex % mediaCovers.length],
          thumbnailUrl: mediaCovers[mediaIndex % mediaCovers.length],
          altText: `Media ${service.title}`,
        },
      });
    } else {
      await prisma.media.create({
        data: {
          providerId: provider.id,
          serviceId: service.id,
          type: mediaIndex % 3 === 1 ? "VIDEO" : "PHOTO",
          url: mediaCovers[mediaIndex % mediaCovers.length],
          thumbnailUrl: mediaCovers[mediaIndex % mediaCovers.length],
          altText: `Media ${service.title}`,
          sortOrder: 0,
        },
      });
    }

    for (const review of service.reviews) {
      await prisma.review.upsert({
        where: { id: review.id },
        update: {
          sentiment: review.sentiment.toUpperCase(),
          status: "VERIFIED",
          verificationMethod: "SEED",
          author: review.author,
          text: review.text,
          createdAt: new Date(review.createdAt),
        },
        create: {
          id: review.id,
          serviceId: service.id,
          sentiment: review.sentiment.toUpperCase(),
          status: "VERIFIED",
          verificationMethod: "SEED",
          author: review.author,
          text: review.text,
          createdAt: new Date(review.createdAt),
        },
      });
    }
  }

  console.log("Seeded Tikep SQLite demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
