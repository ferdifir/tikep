import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { slugify } from "@/lib/slugify";
import { allowedImageTypes, getUploadMeta, saveUploadFile } from "@/lib/upload-files";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, deletedAt: null },
    include: serviceInclude,
  });

  if (!service) {
    return NextResponse.json({ error: "Produk/layanan tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ service: mapService(service) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, form] = await Promise.all([params, request.formData().catch(() => null)]);

  if (!form) {
    const response = authErrorResponse(await getUserFromInitDataOrDemo(undefined).catch((error) => error));
    return response ?? NextResponse.json({ error: "Form produk/layanan tidak valid." }, { status: 400 });
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

  const service = await prisma.service.findFirst({
    where: { id, deletedAt: null },
    include: {
      provider: true,
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Produk/layanan tidak ditemukan." }, { status: 404 });
  }

  if (service.provider.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Kamu tidak punya akses mengubah produk/layanan ini." }, { status: 403 });
  }

  const coverFile = form.get("coverFile");
  const title = typeof form.get("title") === "string" ? String(form.get("title")).trim() : "";
  const categoryName = typeof form.get("category") === "string" ? String(form.get("category")).trim() : "";
  const description = typeof form.get("description") === "string" ? String(form.get("description")).trim() : "";
  const price = Number(form.get("price"));

  if (title.length < 4 || categoryName.length < 2 || !Number.isFinite(price) || price <= 0 || description.length < 12) {
    return NextResponse.json({ error: "Data produk/layanan belum lengkap." }, { status: 400 });
  }

  const shouldUpdateCover = coverFile instanceof File && coverFile.size > 0;

  if (shouldUpdateCover) {
    const coverMeta = getUploadMeta(coverFile, allowedImageTypes);

    if ("error" in coverMeta) {
      const coverError = coverMeta.error ?? "Cover tidak valid.";
      return NextResponse.json({ error: coverError }, { status: coverError.includes("Ukuran") ? 413 : 415 });
    }
  }

  const savedCover = shouldUpdateCover ? await saveUploadFile(coverFile, { allowedTypes: allowedImageTypes }) : null;

  const category =
    (await prisma.category.findFirst({
      where: {
        slug: slugify(categoryName),
        deletedAt: null,
      },
    })) ??
    (await prisma.category.create({
      data: {
        slug: slugify(categoryName),
        name: categoryName,
      },
    }));

  const updatedService = await prisma.$transaction(async (transaction) => {
    if (savedCover) {
      const existingCover = await transaction.media.findFirst({
        where: { serviceId: service.id },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });

      if (existingCover) {
        await transaction.media.update({
          where: { id: existingCover.id },
          data: {
            type: "PHOTO",
            url: savedCover.url,
            thumbnailUrl: savedCover.url,
            altText: `Media ${title}`,
          },
        });
      } else {
        await transaction.media.create({
          data: {
            providerId: service.providerId,
            serviceId: service.id,
            type: "PHOTO",
            url: savedCover.url,
            thumbnailUrl: savedCover.url,
            altText: `Media ${title}`,
            sortOrder: 0,
          },
        });
      }
    }

    return transaction.service.update({
      where: { id: service.id },
      data: {
        title,
        categoryId: category.id,
        price,
        description,
      },
      include: serviceInclude,
    });
  });

  return NextResponse.json({ service: mapService(updatedService, user.id) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, body] = await Promise.all([
    params,
    request.json().catch(() => ({})) as Promise<{ initData?: string }>,
  ]);
  const user = await getUserFromInitDataOrDemo(body.initData).catch((error) => {
    const response = authErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  });

  if (user instanceof NextResponse) {
    return user;
  }

  const service = await prisma.service.findFirst({
    where: { id, deletedAt: null },
    include: {
      provider: true,
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Produk/layanan tidak ditemukan." }, { status: 404 });
  }

  if (service.provider.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Kamu tidak punya akses menghapus produk/layanan ini." }, { status: 403 });
  }

  await prisma.service.update({
    where: { id: service.id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
