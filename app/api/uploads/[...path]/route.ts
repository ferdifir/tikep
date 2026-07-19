import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function getUploadPath(pathSegments: string[]) {
  const uploadRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");
  const requestedPath = path.normalize(path.join(uploadRoot, ...pathSegments));

  if (requestedPath !== uploadRoot && requestedPath.startsWith(`${uploadRoot}${path.sep}`)) {
    return requestedPath;
  }

  return null;
}

function getBaseHeaders(filePath: string, size: number) {
  return {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Content-Length": String(size),
  };
}

async function serveUpload(request: Request, pathSegments: string[], headOnly = false) {
  const filePath = getUploadPath(pathSegments);

  if (!filePath) {
    return NextResponse.json({ error: "File tidak valid." }, { status: 400 });
  }

  const fileStat = await stat(filePath).catch(() => null);

  if (!fileStat?.isFile()) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }

  const headers = getBaseHeaders(filePath, fileStat.size);
  const range = request.headers.get("range");

  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : fileStat.size - 1;

    if (!match || start > end || end >= fileStat.size) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileStat.size}`,
          "Cache-Control": headers["Cache-Control"],
        },
      });
    }

    const fileBuffer = headOnly ? null : (await readFile(filePath)).subarray(start, end + 1);

    return new Response(fileBuffer, {
      status: 206,
      headers: {
        ...headers,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
      },
    });
  }

  const fileBuffer = headOnly ? null : await readFile(filePath);

  return new Response(fileBuffer, { headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  return serveUpload(request, pathSegments);
}

export async function HEAD(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  return serveUpload(request, pathSegments, true);
}
