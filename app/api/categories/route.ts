import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { slugify } from "@/lib/slugify";

export async function GET(request: Request) {
  const user = await getUserFromInitDataOrDemo(new URL(request.url).searchParams.get("initData")?.trim() || undefined).catch(
    (error) => {
      const response = authErrorResponse(error);
      if (response) {
        return response;
      }
      throw error;
    },
  );

  if (user instanceof NextResponse) {
    return user;
  }

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; initData?: string };
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

  const name = body.name?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Nama kategori minimal 2 karakter." }, { status: 400 });
  }

  const slug = slugify(name);
  const existingCategory = await prisma.category.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
  });

  if (existingCategory) {
    return NextResponse.json({ error: "Kategori sudah ada." }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: {
      slug,
      name,
    },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ category }, { status: 201 });
}
