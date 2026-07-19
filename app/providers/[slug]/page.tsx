"use client";

import { ArrowLeft, Heart, ShieldCheck, Star, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { ProfileServiceGrid } from "@/components/profile-service-grid";
import { useTikep } from "@/components/app-provider";
import { findServiceByProviderSlug, getLatestReviews, getProviderSlug, hasRating } from "@/lib/service-utils";

export default function ProviderPreviewPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { services, recommendedIds } = useTikep();
  const providerSeed = findServiceByProviderSlug(services, params.slug);

  if (!providerSeed) {
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
        <EmptyState title="Penyedia tidak ditemukan" body="Profil penyedia ini tidak tersedia di data saat ini." />
      </div>
    );
  }

  const providerServices = services.filter((service) => getProviderSlug(service.provider) === params.slug);
  const reviews = getLatestReviews(providerServices.flatMap((service) => service.reviews), 5);
  const ratedServices = providerServices.filter((service) => hasRating(service.rating));
  const averageRating =
    ratedServices.reduce((total, service) => total + service.rating, 0) / Math.max(ratedServices.length, 1);
  const recommendedCount = providerServices.filter((service) => recommendedIds.includes(service.id)).length;

  return (
    <div className="space-y-5 p-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-full border border-gray-200 p-2 text-gray-700" aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-gray-900">Profil penyedia</span>
      </header>

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${providerSeed.avatarTone}`}>
            {providerSeed.avatar || <UserRound className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900">{providerSeed.provider}</h1>
            <p className="text-sm text-gray-500">Penyedia produk dan jasa digital</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white p-3">
            <p className="text-lg font-bold text-gray-900">{providerServices.length}</p>
            <p className="text-[11px] font-medium text-gray-500">Post</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            {ratedServices.length ? (
              <p className="flex items-center justify-center gap-1 text-lg font-bold text-amber-600">
                <Star className="h-4 w-4 fill-current" />
                {averageRating.toFixed(1)}
              </p>
            ) : (
              <p className="text-lg font-bold text-gray-400">-</p>
            )}
            <p className="text-[11px] font-medium text-gray-500">Rating</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-lg font-bold text-emerald-600">{recommendedCount}</p>
            <p className="text-[11px] font-medium text-gray-500">Rekom</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Produk dan layanan</h2>
        </div>
        <ProfileServiceGrid services={providerServices} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-gray-900">Review terbaru</h2>
        </div>
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
              {review.sentiment === "positive" ? (
                <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              )}
              <p className="leading-5">
                <span className="font-semibold">{review.author}:</span> {review.text}
                {typeof review.reviewScore === "number" ? (
                  <span className="ml-1 font-bold text-gray-500">({review.reviewScore.toFixed(1)})</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
