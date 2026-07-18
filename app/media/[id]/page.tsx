"use client";

import { ArrowLeft, ImageIcon, Play } from "lucide-react";
import NextImage from "next/image";
import { useParams, useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { useTikep } from "@/components/app-provider";
import { getServiceMedia } from "@/lib/service-utils";

export default function MediaPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { services } = useTikep();
  const serviceIndex = services.findIndex((item) => item.id === params.id);
  const service = serviceIndex >= 0 ? services[serviceIndex] : null;

  if (!service) {
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

  const media = getServiceMedia(service.id, serviceIndex);
  const isVideo = media.type === "video";

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
        <NextImage
          src={media.cover}
          alt={media.title}
          fill
          priority
          sizes="(max-width: 640px) 100vw, 448px"
          className="object-cover"
        />
        {isVideo ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur">
              <Play className="ml-1 h-8 w-8 fill-white text-white" />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
