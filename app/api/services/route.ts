import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { slugify } from "@/lib/slugify";
import { allowedImageTypes, getUploadMeta, saveUploadFile } from "@/lib/upload-files";

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

  return NextResponse.json({ services: services.map((service) => mapService(service)) });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);

  if (!form) {
    const response = authErrorResponse(await getUserFromInitDataOrDemo(undefined).catch((error) => error));
    return response ?? NextResponse.json({ error: "Form layanan tidak valid." }, { status: 400 });
  }

  const initData = typeof form.get("initData") === "string" ? String(form.get("initData")).trim() : undefined;
  const user = await getUserFromInitDataOrDemo(initData).catch((error) => {
    const response = authErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  });

  if (user instanceof NextResponse) {
    return user;
  }

  const coverFile = form.get("coverFile");
  const title = typeof form.get("title") === "string" ? String(form.get("title")).trim() : "";
  const providerName = typeof form.get("provider") === "string" ? String(form.get("provider")).trim() : "";
  const categoryName = typeof form.get("category") === "string" ? String(form.get("category")).trim() : "";
  const categoryId = typeof form.get("categoryId") === "string" ? String(form.get("categoryId")).trim() : "";
  const description = typeof form.get("description") === "string" ? String(form.get("description")).trim() : "";
  const price = Number(form.get("price"));

  if (title.length < 4 || providerName.length < 2 || !Number.isFinite(price) || price <= 0 || description.length < 12) {
    return NextResponse.json({ error: "Data layanan belum lengkap." }, { status: 400 });
  }

  if (!(coverFile instanceof File)) {
    return NextResponse.json({ error: "Cover foto wajib dipilih." }, { status: 400 });
  }

  const coverMeta = getUploadMeta(coverFile, allowedImageTypes);

  if ("error" in coverMeta) {
    const coverError = coverMeta.error ?? "Cover tidak valid.";
    return NextResponse.json({ error: coverError }, { status: coverError.includes("Ukuran") ? 413 : 415 });
  }

  const savedCover = await saveUploadFile(coverFile, { allowedTypes: allowedImageTypes });

  const providerSlug = slugify(providerName);
  const existingProvider = await prisma.provider.findUnique({
    where: { slug: providerSlug },
  });

  if (existingProvider?.ownerUserId && existingProvider.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Nama penyedia sudah dipakai user lain." }, { status: 409 });
  }

  const provider = existingProvider
    ? await prisma.provider.update({
        where: { id: existingProvider.id },
        data: {
          ownerUserId: existingProvider.ownerUserId ?? user.id,
          name: providerName,
        },
      })
    : await prisma.provider.create({
        data: {
          ownerUserId: user.id,
          slug: providerSlug,
          name: providerName,
          bio: "Penyedia produk dan jasa digital",
          avatar: makeAvatar(providerName),
          avatarTone: "bg-violet-100 text-violet-700",
        },
      });

  const category = categoryId
    ? await prisma.category.findUnique({ where: { id: categoryId } })
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
      ratingSnapshot: 0,
      description,
      iconName: usableCategory.name === "Teknologi" ? "workflow" : usableCategory.name === "Konten" ? "pen-line" : "layers",
      previewLabel: "Pratinjau Layanan Baru",
      ownerKind: "me",
      media: {
        create: {
          providerId: provider.id,
          type: "PHOTO",
          url: savedCover.url,
          thumbnailUrl: savedCover.url,
          altText: `Media ${title}`,
          sortOrder: 0,
        },
      },
    },
    include: serviceInclude,
  });

  return NextResponse.json({ service: mapService(createdService, user.id) }, { status: 201 });
}
