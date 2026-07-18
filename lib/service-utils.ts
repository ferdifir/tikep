import type { Review, Service } from "@/lib/types";

export const mediaCovers = [
  "https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80",
];

export function getLatestReviews(reviews: Review[], limit?: number) {
  const sortedReviews = [...reviews].sort((first, second) => (second.createdAt ?? "").localeCompare(first.createdAt ?? ""));

  return typeof limit === "number" ? sortedReviews.slice(0, limit) : sortedReviews;
}

export function getRatingBorderStyle(rating: number) {
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

export function getServiceMedia(serviceId: string, index: number) {
  return {
    cover: mediaCovers[index % mediaCovers.length],
    type: index % 3 === 1 ? "video" : "photo",
    title: `Media ${serviceId}`,
  } as const;
}
