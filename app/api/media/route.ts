import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { prisma } from "@/lib/prisma";
import { normalizeUploadUrl } from "@/lib/media-url";
import { allowedImageTypes, getUploadMeta, saveUploadFile } from "@/lib/upload-files";

export const runtime = "nodejs";

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

export async function GET() {
  const media = await prisma.media.findMany({
    where: { serviceId: null, deletedAt: null },
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
  const form = await request.formData().catch(() => null);

  if (!form) {
    const response = authErrorResponse(await getUserFromInitDataOrDemo(undefined).catch((error) => error));
    return response ?? NextResponse.json({ error: "Form media tidak valid." }, { status: 400 });
  }

  const file = form.get("file");
  const thumbnailFile = form.get("thumbnailFile");
  const initData = form.get("initData");
  const isAnonymous = form.get("isAnonymous") !== "false";
  const caption = typeof form.get("caption") === "string" ? String(form.get("caption")).trim() : "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File foto/video wajib dipilih." }, { status: 400 });
  }

  const uploadMeta = getUploadMeta(file);

  if ("error" in uploadMeta) {
    const uploadError = uploadMeta.error ?? "Upload tidak valid.";
    return NextResponse.json({ error: uploadError }, { status: uploadError.includes("Ukuran") ? 413 : 415 });
  }

  if (uploadMeta.fileMeta.type === "VIDEO" && !(thumbnailFile instanceof File)) {
    return NextResponse.json({ error: "Thumbnail video gagal dibuat." }, { status: 400 });
  }

  const user = await getUserFromInitDataOrDemo(typeof initData === "string" ? initData : undefined).catch((error) => {
    const response = authErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  });

  if (user instanceof NextResponse) {
    return user;
  }

  const savedFile = await saveUploadFile(file);
  const savedThumbnail =
    thumbnailFile instanceof File
      ? await saveUploadFile(thumbnailFile, { allowedTypes: allowedImageTypes })
      : null;

  const createdMedia = await prisma.media.create({
    data: {
      authorUserId: isAnonymous ? null : user.id,
      isAnonymous,
      caption: caption || null,
      type: savedFile.type,
      url: savedFile.url,
      thumbnailUrl: savedThumbnail?.url ?? (savedFile.type === "PHOTO" ? savedFile.url : null),
      altText: caption || (savedFile.type === "PHOTO" ? "Foto showcase Tikep" : "Video showcase Tikep"),
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
