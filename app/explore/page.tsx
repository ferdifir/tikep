"use client";

import { ImageIcon, Play } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useTikep } from "@/components/app-provider";
import { getServiceMedia } from "@/lib/service-utils";

export default function ExplorePage() {
  const { services } = useTikep();

  return (
    <div className="p-3">
      <section className="columns-2 gap-3 [column-fill:_balance]">
        {services.map((service, index) => {
          const media = getServiceMedia(service.id, index);
          const isVideo = media.type === "video";
          const heightClass = index % 4 === 0 ? "h-64" : index % 4 === 1 ? "h-48" : index % 4 === 2 ? "h-72" : "h-56";

          return (
            <article
              key={service.id}
              className="mb-3 break-inside-avoid overflow-hidden rounded-lg bg-gray-100 shadow-sm"
            >
              <Link href={`/media/${service.id}`} className={`relative block ${heightClass} bg-gray-200`}>
                <NextImage
                  src={media.cover}
                  alt={`Media ${service.title}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover"
                />
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
