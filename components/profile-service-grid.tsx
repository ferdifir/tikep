"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { formatCurrency } from "@/lib/format";
import { getRatingBorderStyle, getServiceMedia } from "@/lib/service-utils";
import type { Service } from "@/lib/types";

export function ProfileServiceGrid({ services }: { services: Service[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {services.map((service, index) => {
        const media = getServiceMedia(service.id, index);
        const coverUrl = service.coverUrl ?? media.cover;

        return (
          <Link
            key={service.id}
            href={`/services/${service.id}`}
            className="overflow-hidden rounded-lg p-[2px] shadow-sm"
            style={getRatingBorderStyle(service.rating)}
          >
            <article className="relative aspect-[3/4] overflow-hidden rounded-[6px] bg-gray-200">
              <NextImage
                src={coverUrl}
                alt={`Preview ${service.title}`}
                fill
                sizes="(max-width: 640px) 50vw, 220px"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-16 text-white">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-bold uppercase">{service.category}</span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-black">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                    {service.rating.toFixed(1)}
                  </span>
                </div>
                <h3 className="line-clamp-2 text-sm font-bold leading-tight">{service.title}</h3>
                <p className="mt-1 text-[11px] font-semibold text-white/80">{formatCurrency(service.price)}</p>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
