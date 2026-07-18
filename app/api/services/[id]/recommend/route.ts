import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getDemoUser()]);
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
