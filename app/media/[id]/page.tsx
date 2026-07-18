"use client";

import { ArrowLeft, ImageIcon, Play } from "lucide-react";
import NextImage from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";

type MediaPreview = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  altText: string;
  isAnonymous: boolean;
  authorUser: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

function getDisplayUsername(user: NonNullable<MediaPreview["authorUser"]>) {
  if (user.username) {
    return `@${user.username}`;
  }

  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Tikep user";
}

export default function MediaPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<MediaPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/media/${params.id}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Media not found"))))
      .then((data: { media: MediaPreview }) => setMedia(data.media))
      .catch(() => setMedia(null))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (!media && !isLoading) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 rounded-full border border-gray-200 p-2 text-gray-700"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <EmptyState title="Media tidak ditemukan" body="Foto atau video ini tidak tersedia di data saat ini." />
      </div>
    );
  }

  const isVideo = media?.type === "VIDEO";
  const showVideoElement = isVideo && !media?.thumbnailUrl;
  const authorLabel = media?.authorUser ? getDisplayUsername(media.authorUser) : "";

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => router.back()} className="rounded-full bg-black/35 p-2 backdrop-blur" aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="rounded-full bg-black/35 p-2 backdrop-blur" aria-label={isVideo ? "Video" : "Foto"}>
          {isVideo ? <Play className="h-5 w-5 fill-current" /> : <ImageIcon className="h-5 w-5" />}
        </span>
      </header>

      <main className="relative min-h-screen">
        {media ? (
          showVideoElement ? (
            <video src={media.url} className="h-screen w-full object-contain" controls autoPlay muted playsInline />
          ) : (
            <NextImage
              src={media.thumbnailUrl ?? media.url}
              alt={media.altText}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-contain"
            />
          )
        ) : (
          <div className="h-screen w-full animate-pulse bg-gray-950" />
        )}
        {isVideo ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur">
              <Play className="ml-1 h-8 w-8 fill-white text-white" />
            </div>
          </div>
        ) : null}
        {authorLabel ? (
          <div className="absolute bottom-5 left-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            by {authorLabel}
          </div>
        ) : null}
      </main>
    </div>
  );
}
