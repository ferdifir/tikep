import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, isSystem: true },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const user = await getDemoUser();
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Nama kategori minimal 2 karakter." }, { status: 400 });
  }

  const slug = slugify(name);
  const existingCategory = await prisma.category.findFirst({
    where: {
      slug,
      OR: [{ isSystem: true }, { createdByUserId: user.id }],
    },
  });

  if (existingCategory) {
    return NextResponse.json({ error: "Kategori sudah ada." }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: {
      createdByUserId: user.id,
      slug,
      name,
      isSystem: false,
    },
    select: { id: true, name: true, slug: true, isSystem: true },
  });

  return NextResponse.json({ category }, { status: 201 });
}
