import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      botStartedAt: { not: null },
      telegramChatId: { not: null },
      username: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
    take: 10,
  });

  return NextResponse.json({ users });
}
