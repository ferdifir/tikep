"use client";

import { ImageIcon, Play } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useEffect, useState } from "react";

type ExploreMedia = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  altText: string;
};

export default function ExplorePage() {
  const [mediaItems, setMediaItems] = useState<ExploreMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to load media"))))
      .then((data: { media: ExploreMedia[] }) => setMediaItems(data.media))
      .catch(() => setMediaItems([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-3">
      {isLoading ? (
        <section className="columns-2 gap-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className={`mb-3 break-inside-avoid rounded-lg bg-gray-100 ${
                item % 3 === 0 ? "h-64" : item % 3 === 1 ? "h-48" : "h-72"
              }`}
            />
          ))}
        </section>
      ) : null}

      <section className="columns-2 gap-3 [column-fill:_balance]">
        {mediaItems.map((media, index) => {
          const isVideo = media.type === "VIDEO";
          const showVideoElement = isVideo && !media.thumbnailUrl;
          const heightClass = index % 4 === 0 ? "h-64" : index % 4 === 1 ? "h-48" : index % 4 === 2 ? "h-72" : "h-56";

          return (
            <article
              key={media.id}
              className="mb-3 break-inside-avoid overflow-hidden rounded-lg bg-gray-100 shadow-sm"
            >
              <Link href={`/media/${media.id}`} className={`relative block ${heightClass} bg-gray-200`}>
                {showVideoElement ? (
                  <video
                    src={media.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    aria-label={media.altText}
                  />
                ) : (
                  <NextImage
                    src={media.thumbnailUrl ?? media.url}
                    alt={media.altText}
                    fill
                    sizes="(max-width: 640px) 50vw, 220px"
                    className="object-cover"
                  />
                )}
                <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
                  {isVideo ? <Play className="h-4 w-4 fill-current" /> : <ImageIcon className="h-4 w-4" />}
                </div>
              </Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
