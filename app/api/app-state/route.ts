import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getDemoUser();
  const [services, categories, recommendations, reports] = await Promise.all([
    prisma.service.findMany({
      orderBy: { createdAt: "desc" },
      include: serviceInclude,
    }),
    prisma.category.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isSystem: true },
    }),
    prisma.recommendation.findMany({
      where: { userId: user.id },
      select: { serviceId: true },
    }),
    prisma.report.findMany({
      where: { userId: user.id },
      select: { serviceId: true },
    }),
  ]);

  return NextResponse.json({
    services: services.map(mapService),
    categories,
    recommendedIds: recommendations.map((item) => item.serviceId),
    reportedIds: reports.map((item) => item.serviceId),
  });
}
