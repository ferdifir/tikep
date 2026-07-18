import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await prisma.media.findFirst({
    where: {
      OR: [{ id }, { serviceId: id }],
    },
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

  if (!media) {
    return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ media });
}
