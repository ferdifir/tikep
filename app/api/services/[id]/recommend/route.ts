import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = (await request.json().catch(() => ({}))) as { initData?: string };
  const [{ id }, user] = await Promise.all([
    params,
    getUserFromInitDataOrDemo(body.initData).catch((error) => {
      const response = authErrorResponse(error);
      if (response) {
        return response;
      }
      throw error;
    }),
  ]);

  if (user instanceof NextResponse) {
    return user;
  }

  const existingRecommendation = await prisma.recommendation.findUnique({
    where: {
      serviceId_userId: {
        serviceId: id,
        userId: user.id,
      },
    },
  });

  if (existingRecommendation) {
    await prisma.recommendation.delete({ where: { id: existingRecommendation.id } });
    return NextResponse.json({ recommended: false });
  }

  await prisma.recommendation.create({
    data: {
      serviceId: id,
      userId: user.id,
    },
  });

  return NextResponse.json({ recommended: true });
}
