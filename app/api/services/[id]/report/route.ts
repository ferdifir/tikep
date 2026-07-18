import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getDemoUser()]);
  await prisma.report.upsert({
    where: {
      serviceId_userId: {
        serviceId: id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      serviceId: id,
      userId: user.id,
    },
  });

  return NextResponse.json({ reported: true });
}
