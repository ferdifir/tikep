"use client";

import { ImageIcon, Loader2, Play } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";
import { shouldBypassImageOptimization } from "@/lib/media-url";

const STORAGE_KEY = "explore:state_v3";
const PAGE_SIZE = 24;

type ExploreMedia = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  altText: string;
};

type SavedState = {
  media: ExploreMedia[];
  nextCursor: string | null;
  hasMore: boolean;
  scrollY: number;
};

export default function ExplorePage() {
  const [mediaItems, setMediaItems] = useState<ExploreMedia[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialError, setInitialError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ mediaItems, nextCursor, hasMore });
  const loadingRef = useRef(false);
  const restoredRef = useRef(false);
  const scrollYRef = useRef(0);

  stateRef.current = { mediaItems, nextCursor, hasMore };

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: SavedState = JSON.parse(saved);
        restoredRef.current = true;
        scrollYRef.current = state.scrollY;
        setMediaItems(state.media);
        setNextCursor(state.nextCursor);
        setHasMore(state.hasMore);
        setIsLoading(false);
        return;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    fetchInitial();
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    const y = scrollYRef.current;
    if (y < 1) return;
    const id = setTimeout(() => window.scrollTo(0, y), 300);
    return () => clearTimeout(id);
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      const s = stateRef.current;
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            media: s.mediaItems,
            nextCursor: s.nextCursor,
            hasMore: s.hasMore,
            scrollY: window.scrollY,
          }),
        );
      } catch {
        /* quota exceeded */
      }
    };
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      () => {
        loadMoreRef.current?.();
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore]);

  async function fetchInitial() {
    setIsLoading(true);
    setInitialError(false);
    try {
      const res = await fetch(`/api/media?limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMediaItems(data.media);
      setNextCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch {
      setInitialError(true);
      setMediaItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  const loadMoreRef = useRef<(() => void) | null>(null);

  loadMoreRef.current = async () => {
    if (loadingRef.current) return;
    const nc = stateRef.current.nextCursor;
    if (!nc) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/media?cursor=${nc}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMediaItems((prev) => [...prev, ...data.media]);
      setNextCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch {
      /* silent */
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  if (initialError && mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-gray-500">
        <p className="text-sm">Gagal memuat media.</p>
        <button
          type="button"
          onClick={fetchInitial}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="p-3">
      {isLoading ? (
        <section className="columns-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={`mb-3 break-inside-avoid rounded-lg bg-gray-100 ${
                i % 3 === 0 ? "h-64" : i % 3 === 1 ? "h-48" : "h-72"
              }`}
            />
          ))}
        </section>
      ) : null}

      <section className="columns-2 gap-3">
        {mediaItems.map((media, index) => {
          const isVideo = media.type === "VIDEO";
          const showVideoElement = isVideo && !media.thumbnailUrl;
          const heightClass =
            index % 4 === 0 ? "h-64" : index % 4 === 1 ? "h-48" : index % 4 === 2 ? "h-72" : "h-56";

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
                    unoptimized={shouldBypassImageOptimization(media.thumbnailUrl ?? media.url)}
                    sizes="(max-width: 640px) 50vw, 220px"
                    className="object-cover"
                  />
                )}
                <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
                  {isVideo ? (
                    <Play className="h-4 w-4 fill-current" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </div>
              </Link>
            </article>
          );
        })}
      </section>

      {isLoadingMore ? (
        <div className="flex justify-center py-6 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}

      {hasMore && !isLoading ? <div ref={sentinelRef} className="h-px" /> : null}

      {!hasMore && mediaItems.length > 0 ? (
        <p className="py-6 text-center text-xs text-gray-400">Semua media telah dimuat</p>
      ) : null}
    </div>
  );
}
