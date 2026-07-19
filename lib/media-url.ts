export function normalizeUploadUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (url.startsWith("/uploads/")) {
    return `/api${url}`;
  }

  return url;
}

export function shouldBypassImageOptimization(url: string | null | undefined) {
  return Boolean(url?.startsWith("/api/uploads/") || url?.startsWith("/uploads/"));
}
