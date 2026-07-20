"use client";

import { Flag, Heart, Layers, PenLine, Share2, Star, ThumbsDown, ThumbsUp, TrendingUp, Workflow } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useMemo, useState } from "react";
import { ServiceInquiryButton } from "@/components/service-inquiry-button";
import { formatCurrency } from "@/lib/format";
import { shouldBypassImageOptimization } from "@/lib/media-url";
import { shareService } from "@/lib/share-links";
import { getLatestReviews, getProviderSlug, getRatingBorderStyle, getRatingTone, hasRating } from "@/lib/service-utils";
import type { IconMap, Service } from "@/lib/types";
import { useTikep } from "@/components/app-provider";

const iconMap: IconMap = {
  layers: Layers,
  "pen-line": PenLine,
  "trending-up": TrendingUp,
  workflow: Workflow,
};

export function ServiceCard({ service }: { service: Service }) {
  const { recommendedIds, reportedIds, toggleRecommendation, reportService } = useTikep();
  const recommended = recommendedIds.includes(service.id);
  const reported = reportedIds.includes(service.id);
  const PreviewIcon = iconMap[service.iconName] ?? Layers;
  const latestReviews = getLatestReviews(service.reviews, 2);
  const showRating = hasRating(service.rating);
  const [shareStatus, setShareStatus] = useState("");

  async function handleShare() {
    try {
      await shareService({ id: service.id, title: service.title });
      setShareStatus("Link disalin");
      window.setTimeout(() => setShareStatus(""), 1800);
    } catch {
      setShareStatus("");
    }
  }

  return (
    <article className="rounded-2xl p-[2px] shadow-sm" style={getRatingBorderStyle(service.rating)}>
      <div className="overflow-hidden rounded-[14px] bg-white">
      <div className="flex items-center justify-between gap-3 p-3">
        <Link href={`/providers/${getProviderSlug(service.provider)}`} className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${service.avatarUrl ? "" : service.avatarTone}`}>
            {service.avatarUrl ? (
              <NextImage src={service.avatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" unoptimized />
            ) : (
              service.avatar
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold leading-tight">{service.title}</h2>
            <span className="text-xs text-gray-500">Oleh {service.provider}</span>
          </div>
        </Link>
        {showRating ? (
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${getRatingTone(service.rating)}`}
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            {service.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <Link
        href={`/services/${service.id}`}
        className="relative flex aspect-square flex-col items-center justify-center border-y border-gray-100 bg-slate-100 p-4 text-gray-400"
      >
        {service.coverUrl ? (
          <NextImage
            src={service.coverUrl}
            alt={`Preview ${service.title}`}
            fill
            unoptimized={shouldBypassImageOptimization(service.coverUrl)}
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover"
          />
        ) : (
          <>
            <PreviewIcon className="mb-2 h-16 w-16 text-gray-300" />
            <span className="text-xs font-medium text-gray-500">{service.previewLabel}</span>
          </>
        )}
        <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs font-bold text-white">
          {formatCurrency(service.price)}
        </span>
      </Link>

      <div className="space-y-3 p-4">
        <Link href={`/services/${service.id}`} className="block space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">{service.category}</span>
            {service.owner === "me" ? (
              <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">Milik saya</span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-gray-600">{service.description}</p>
        </Link>

        <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
          {latestReviews.map((review, index) => (
            <div
              key={review.id}
              className={`flex items-start gap-2 ${index > 0 ? "border-t border-gray-200 pt-2" : ""}`}
            >
              {review.sentiment === "positive" ? (
                <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              )}
              <p>
                <span className="font-semibold">{review.author}:</span> {review.text}
                {typeof review.reviewScore === "number" ? (
                  <span className="ml-1 font-bold text-gray-500">({review.reviewScore.toFixed(1)})</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>

        {service.owner === "me" ? null : <ServiceInquiryButton service={service} />}

        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => toggleRecommendation(service.id)}
            className={`flex items-center gap-1.5 text-xs font-semibold transition ${
              recommended ? "text-emerald-600" : "text-gray-500 hover:text-emerald-600"
            }`}
          >
            <Heart className={`h-4 w-4 ${recommended ? "fill-emerald-500 text-emerald-500" : ""}`} />
            <span>{recommended ? "Direkomendasikan" : "Rekomendasikan"}</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleShare}
              className="text-gray-500 transition hover:text-indigo-600"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => reportService(service.id)}
              className={`transition ${reported ? "text-rose-600" : "text-gray-400 hover:text-rose-600"}`}
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </article>
  );
}
