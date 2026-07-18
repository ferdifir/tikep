import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequestUrl, getUserFromInitDataOrDemo } from "@/lib/request-user";

export async function GET(request: Request) {
  const user = await getUserFromInitDataOrDemo(getInitDataFromRequestUrl(request)).catch((error) => {
    const response = authErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  });

  if (user instanceof NextResponse) {
    return user;
  }

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
    currentUser: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
    },
    services: services.map((service) => mapService(service, user.id)),
    categories,
    recommendedIds: recommendations.map((item) => item.serviceId),
    reportedIds: reports.map((item) => item.serviceId),
  });
}
