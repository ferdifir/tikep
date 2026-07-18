import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maxUploadBytes = 25 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", { extension: "jpg", type: "PHOTO" }],
  ["image/png", { extension: "png", type: "PHOTO" }],
  ["image/webp", { extension: "webp", type: "PHOTO" }],
  ["video/mp4", { extension: "mp4", type: "VIDEO" }],
  ["video/webm", { extension: "webm", type: "VIDEO" }],
]);

function toMediaResponse<
  T extends {
    isAnonymous: boolean;
    authorUser: { username: string | null; firstName: string | null; lastName: string | null } | null;
  },
>(media: T) {
  return {
    ...media,
    authorUser: media.isAnonymous ? null : media.authorUser,
  };
}

export async function GET() {
  const media = await prisma.media.findMany({
    orderBy: [{ createdAt: "desc" }, { sortOrder: "asc" }],
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

  return NextResponse.json({ media: media.map(toMediaResponse) });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const initData = form.get("initData");
  const isAnonymous = form.get("isAnonymous") !== "false";
  const caption = typeof form.get("caption") === "string" ? String(form.get("caption")).trim() : "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File foto/video wajib dipilih." }, { status: 400 });
  }

  const fileMeta = allowedTypes.get(file.type);

  if (!fileMeta) {
    return NextResponse.json({ error: "Format file belum didukung." }, { status: 415 });
  }

  if (file.size <= 0 || file.size > maxUploadBytes) {
    return NextResponse.json({ error: "Ukuran file maksimal 25 MB." }, { status: 413 });
  }

  const user = await getUserFromInitDataOrDemo(typeof initData === "string" ? initData : undefined);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
  const filename = `${Date.now()}-${randomUUID()}.${fileMeta.extension}`;
  const diskPath = path.join(uploadDir, filename);
  const publicUrl = `/uploads/media/${filename}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));

  const createdMedia = await prisma.media.create({
    data: {
      authorUserId: isAnonymous ? null : user.id,
      isAnonymous,
      caption: caption || null,
      type: fileMeta.type,
      url: publicUrl,
      thumbnailUrl: fileMeta.type === "PHOTO" ? publicUrl : null,
      altText: caption || (fileMeta.type === "PHOTO" ? "Foto showcase Tikep" : "Video showcase Tikep"),
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

  return NextResponse.json({ media: toMediaResponse(createdMedia) }, { status: 201 });
}
