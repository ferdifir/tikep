"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ServiceCard } from "@/components/service-card";
import { useTikep } from "@/components/app-provider";
import { CustomSelect } from "@/components/custom-select";
import { EmptyState } from "@/components/empty-state";
import { hasRating } from "@/lib/service-utils";
import type { ServiceCategory } from "@/lib/types";

type RatingFilter = "all" | "recommended" | "risk";

export default function HomePage() {
  const { services, categories, recommendedIds, homeFiltersOpen, isAppStateLoading } = useTikep();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "Semua">("Semua");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return services.filter((service) => {
      const matchesQuery =
        !normalizedQuery ||
        [service.title, service.provider, service.description, service.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory = category === "Semua" || service.category === category;
      const matchesRating =
        ratingFilter === "all" ||
        (ratingFilter === "recommended" && hasRating(service.rating) && service.rating >= 4) ||
        (ratingFilter === "risk" && hasRating(service.rating) && service.rating < 4);

      return matchesQuery && matchesCategory && matchesRating;
    });
  }, [category, query, ratingFilter, services]);

  return (
    <div className="space-y-4 p-4">
      {homeFiltersOpen ? (
        <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari produk, layanan, penyedia, kategori"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["Semua", ...categories] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${
                  category === item
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" />
            <CustomSelect
              value={ratingFilter}
              onChange={(value) => setRatingFilter(value as RatingFilter)}
              className="flex-1"
              buttonClassName="h-9 rounded-md px-2 text-xs"
              options={[
                { value: "all", label: "Semua rating" },
                { value: "recommended", label: "Rating 4.0 ke atas" },
                { value: "risk", label: "Rating di bawah 4.0" },
              ]}
            />
            <span className="rounded-md bg-gray-50 px-2 py-2 text-xs font-bold text-gray-600">
              {filteredServices.length}
            </span>
          </div>
        </section>
      ) : null}

      {isAppStateLoading ? (
        <section className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="aspect-[4/3] animate-pulse bg-gray-100" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </section>
      ) : filteredServices.length ? (
        <section className="space-y-6">
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </section>
      ) : (
        <EmptyState title="Tidak ada produk/layanan" body="Coba kata kunci, kategori, atau filter rating yang berbeda." />
      )}

      {recommendedIds.length ? (
        <p className="pb-1 text-center text-xs font-medium text-gray-500">
          {recommendedIds.length} produk/layanan sudah masuk daftar rekomendasi Anda.
        </p>
      ) : null}
    </div>
  );
}
