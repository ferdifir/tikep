import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

function makeAvatar(provider: string) {
  return provider
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "TK";
}

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
    include: serviceInclude,
  });

  return NextResponse.json({ services: services.map(mapService) });
}

export async function POST(request: Request) {
  const user = await getDemoUser();
  const body = (await request.json()) as {
    title?: string;
    provider?: string;
    category?: string;
    categoryId?: string;
    price?: number;
    description?: string;
  };
  const title = body.title?.trim() ?? "";
  const providerName = body.provider?.trim() ?? "";
  const categoryName = body.category?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const price = Number(body.price);

  if (title.length < 4 || providerName.length < 2 || !Number.isFinite(price) || price <= 0 || description.length < 12) {
    return NextResponse.json({ error: "Data layanan belum lengkap." }, { status: 400 });
  }

  const provider = await prisma.provider.upsert({
    where: { slug: slugify(providerName) },
    update: {
      name: providerName,
    },
    create: {
      ownerUserId: user.id,
      slug: slugify(providerName),
      name: providerName,
      bio: "Penyedia produk dan jasa digital",
      avatar: makeAvatar(providerName),
      avatarTone: "bg-violet-100 text-violet-700",
    },
  });

  const category = body.categoryId
    ? await prisma.category.findUnique({ where: { id: body.categoryId } })
    : await prisma.category.findFirst({
        where: {
          slug: slugify(categoryName),
          OR: [{ isSystem: true }, { createdByUserId: user.id }],
        },
      });

  const usableCategory =
    category ??
    (await prisma.category.create({
      data: {
        createdByUserId: user.id,
        slug: slugify(categoryName || "Lainnya"),
        name: categoryName || "Lainnya",
        isSystem: false,
      },
    }));

  const now = Date.now();
  const createdService = await prisma.service.create({
    data: {
      id: `${now}-${slugify(title)}`,
      providerId: provider.id,
      categoryId: usableCategory.id,
      title,
      price,
      ratingSnapshot: 4.2,
      description,
      iconName: usableCategory.name === "Teknologi" ? "workflow" : usableCategory.name === "Konten" ? "pen-line" : "layers",
      previewLabel: "Pratinjau Layanan Baru",
      ownerKind: "me",
      reviews: {
        create: [
          {
            id: `new-${now}-positive`,
            sentiment: "POSITIVE",
            status: "UNVERIFIED",
            verificationMethod: "NONE",
            author: "Tikep",
            text: "Layanan baru siap menerima rekomendasi pertama.",
            createdAt: new Date(now),
          },
          {
            id: `new-${now}-note`,
            sentiment: "NEGATIVE",
            status: "UNVERIFIED",
            verificationMethod: "NONE",
            author: "Tikep",
            text: "Belum ada catatan kendala dari pembeli.",
            createdAt: new Date(now - 60000),
          },
        ],
      },
      media: {
        create: {
          providerId: provider.id,
          type: "PHOTO",
          url: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=600&q=80",
          thumbnailUrl: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=600&q=80",
          altText: `Media ${title}`,
          sortOrder: 0,
        },
      },
    },
    include: serviceInclude,
  });

  return NextResponse.json({ service: mapService(createdService) }, { status: 201 });
}
