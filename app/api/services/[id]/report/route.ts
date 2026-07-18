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
