import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const maxUploadBytes = 25 * 1024 * 1024;

export const allowedUploadTypes = new Map([
  ["image/jpeg", { extension: "jpg", type: "PHOTO" }],
  ["image/png", { extension: "png", type: "PHOTO" }],
  ["image/webp", { extension: "webp", type: "PHOTO" }],
  ["video/mp4", { extension: "mp4", type: "VIDEO" }],
  ["video/webm", { extension: "webm", type: "VIDEO" }],
]);

export const allowedImageTypes = new Map([
  ["image/jpeg", { extension: "jpg", type: "PHOTO" }],
  ["image/png", { extension: "png", type: "PHOTO" }],
  ["image/webp", { extension: "webp", type: "PHOTO" }],
]);

type UploadMetaResult =
  | { fileMeta: { extension: string; type: string }; error?: never }
  | { error: string; fileMeta?: never };

export function getUploadMeta(file: File, allowedTypes = allowedUploadTypes): UploadMetaResult {
  const fileMeta = allowedTypes.get(file.type);

  if (!fileMeta) {
    return { error: "Format file belum didukung." as const };
  }

  if (file.size <= 0 || file.size > maxUploadBytes) {
    return { error: "Ukuran file maksimal 25 MB." as const };
  }

  return { fileMeta };
}

export async function saveUploadFile(file: File, options?: { allowedTypes?: typeof allowedUploadTypes; directory?: string }) {
  const uploadMeta = getUploadMeta(file, options?.allowedTypes ?? allowedUploadTypes);

  if ("error" in uploadMeta) {
    throw new Error(uploadMeta.error);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", options?.directory ?? "media");
  const filename = `${Date.now()}-${randomUUID()}.${uploadMeta.fileMeta.extension}`;
  const diskPath = path.join(uploadDir, filename);
  const publicUrl = `/api/uploads/${options?.directory ?? "media"}/${filename}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));

  return {
    type: uploadMeta.fileMeta.type,
    url: publicUrl,
  };
}
