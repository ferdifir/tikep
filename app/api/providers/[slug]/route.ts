import { NextResponse } from "next/server";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = await prisma.provider.findUnique({
    where: { slug },
    include: {
      services: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: serviceInclude,
      },
      media: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Penyedia tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({
    provider: {
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      bio: provider.bio,
      avatar: provider.avatar,
      avatarTone: provider.avatarTone,
    },
    services: provider.services.map((service) => mapService(service)),
    media: provider.media,
  });
}
