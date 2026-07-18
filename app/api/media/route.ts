import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const media = await prisma.media.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      serviceId: true,
      type: true,
      url: true,
      thumbnailUrl: true,
      altText: true,
      sortOrder: true,
      service: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return NextResponse.json({ media });
}
