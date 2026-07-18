import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { seedServices } from "@/lib/seed-data";

export async function POST() {
  const user = await getDemoUser();
  const seedIds = seedServices.map((service) => service.id);

  await prisma.$transaction([
    prisma.reviewCode.deleteMany({}),
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
    services: services.map(mapService),
    categories,
    recommendedIds: [],
    reportedIds: [],
  });
}
