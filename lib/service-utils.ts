import type { Review, Service } from "@/lib/types";

export function getLatestReviews(reviews: Review[], limit?: number) {
  const sortedReviews = [...reviews].sort((first, second) => (second.createdAt ?? "").localeCompare(first.createdAt ?? ""));

  return typeof limit === "number" ? sortedReviews.slice(0, limit) : sortedReviews;
}

export function hasRating(rating: number) {
  return rating > 0;
}

export function getRatingBorderStyle(rating: number) {
  if (!hasRating(rating)) {
    return {
      background: "rgb(229 231 235)",
    };
  }

  const clampedRating = Math.max(0, Math.min(5, rating));
  const hue = Math.round((clampedRating / 5) ** 1.7 * 135);

  return {
    background: `linear-gradient(135deg, hsl(${hue} 78% 48%), hsl(${Math.min(hue + 28, 145)} 74% 55%))`,
  };
}

export function getRatingCircleStyle(rating: number) {
  const clampedRating = Math.max(0, Math.min(5, rating));
  const hue = Math.round((clampedRating / 5) ** 1.7 * 135);

  return {
    background: `hsl(${hue} 78% 48%)`,
  };
}

export function getRatingTone(rating: number) {
  if (rating >= 4.2) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (rating >= 3) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function getProviderSlug(provider: string) {
  return provider
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findServiceByProviderSlug(services: Service[], slug: string) {
  return services.find((service) => getProviderSlug(service.provider) === slug);
}
