import { NextResponse } from "next/server";
import { normalizeUploadUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

function toMediaResponse<
  T extends {
    isAnonymous: boolean;
    url: string;
    thumbnailUrl: string | null;
    authorUser: { username: string | null; firstName: string | null; lastName: string | null } | null;
  },
>(media: T) {
  return {
    ...media,
    url: normalizeUploadUrl(media.url) ?? media.url,
    thumbnailUrl: normalizeUploadUrl(media.thumbnailUrl),
    authorUser: media.isAnonymous ? null : media.authorUser,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await prisma.media.findFirst({
    where: {
      OR: [{ id }, { serviceId: id }],
    },
    select: {
      id: true,
      serviceId: true,
      isAnonymous: true,
      caption: true,
      type: true,
      url: true,
      thumbnailUrl: true,
      altText: true,
      sortOrder: true,
      createdAt: true,
      authorUser: {
        select: {
          username: true,
          firstName: true,
          lastName: true,
        },
      },
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

  return NextResponse.json({ media: toMediaResponse(media) });
}
