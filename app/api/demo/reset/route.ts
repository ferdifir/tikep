import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { seedServices } from "@/lib/seed-data";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Demo reset tidak tersedia di production." }, { status: 404 });
  }

  const user = await getDemoUser();
  const seedIds = seedServices.map((service) => service.id);

  await prisma.$transaction([
    prisma.reviewCode.deleteMany({}),
    prisma.walletLedger.deleteMany({}),
    prisma.withdrawRequest.deleteMany({}),
    prisma.giftPayment.deleteMany({}),
    prisma.media.deleteMany({
      where: {
        serviceId: null,
        OR: [{ authorUserId: user.id }, { authorUserId: null }],
      },
    }),
    prisma.review.deleteMany({
      where: {
        id: {
          notIn: seedServices.flatMap((service) => service.reviews.map((review) => review.id)),
        },
      },
    }),
    prisma.recommendation.deleteMany({ where: { userId: user.id } }),
    prisma.report.deleteMany({ where: { userId: user.id } }),
    prisma.wallet.updateMany({
      where: { userId: user.id },
      data: {
        balance: 0,
        pendingWithdraw: 0,
        totalEarned: 0,
      },
    }),
    prisma.service.deleteMany({
      where: {
        id: {
          notIn: seedIds,
        },
      },
    }),
    prisma.category.deleteMany({
      where: {
        isSystem: false,
        createdByUserId: user.id,
      },
    }),
  ]);

  const [services, categories] = await Promise.all([
    prisma.service.findMany({
      orderBy: { createdAt: "desc" },
      include: serviceInclude,
    }),
    prisma.category.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isSystem: true },
    }),
  ]);

  return NextResponse.json({
    services: services.map((service) => mapService(service, user.id)),
    categories,
    recommendedIds: [],
    reportedIds: [],
  });
}
