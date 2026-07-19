import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { slugify } from "@/lib/slugify";

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
  const [{ id }, body] = await Promise.all([
    params,
    request.json().catch(() => ({})) as Promise<{
      initData?: string;
      title?: string;
      category?: string;
      price?: number | string;
      description?: string;
    }>,
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
    return NextResponse.json({ error: "Kamu tidak punya akses mengubah produk/layanan ini." }, { status: 403 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const categoryName = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const price = Number(body.price);

  if (title.length < 4 || categoryName.length < 2 || !Number.isFinite(price) || price <= 0 || description.length < 12) {
    return NextResponse.json({ error: "Data produk/layanan belum lengkap." }, { status: 400 });
  }

  const category =
    (await prisma.category.findFirst({
      where: {
        slug: slugify(categoryName),
        createdByUserId: user.id,
        isSystem: false,
      },
    })) ??
    (await prisma.category.create({
      data: {
        createdByUserId: user.id,
        slug: slugify(categoryName),
        name: categoryName,
        isSystem: false,
      },
    }));

  const updatedService = await prisma.service.update({
    where: { id: service.id },
    data: {
      title,
      categoryId: category.id,
      price,
      description,
    },
    include: serviceInclude,
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
