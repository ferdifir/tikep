import { NextResponse } from "next/server";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    include: serviceInclude,
  });

  if (!service) {
    return NextResponse.json({ error: "Produk/layanan tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ service: mapService(service) });
}
