import "server-only";
import type { Service } from "@/lib/types";

type DbService = {
  id: string;
  title: string;
  price: number;
  ratingSnapshot: number;
  description: string;
  iconName: string;
  previewLabel: string;
  ownerKind: string;
  createdAt: Date;
  provider: {
    name: string;
    avatar: string;
    avatarTone: string;
  };
  category: {
    name: string;
  };
  reviews: {
    id: string;
    sentiment: string;
    reviewScore: number | null;
    status: string;
    verificationMethod: string;
    author: string;
    text: string;
    createdAt: Date;
  }[];
};

export function mapService(service: DbService): Service {
  return {
    id: service.id,
    title: service.title,
    provider: service.provider.name,
    avatar: service.provider.avatar,
    avatarTone: service.provider.avatarTone,
    category: service.category.name,
    price: service.price,
    rating: service.ratingSnapshot,
    description: service.description,
    iconName: service.iconName,
    previewLabel: service.previewLabel,
    owner: service.ownerKind === "me" ? "me" : "other",
    createdAt: service.createdAt.toISOString().slice(0, 10),
    reviews: service.reviews.map((review) => ({
      id: review.id,
      sentiment: review.sentiment === "POSITIVE" ? "positive" : "negative",
      reviewScore: review.reviewScore,
      status: review.status as Service["reviews"][number]["status"],
      verificationMethod: review.verificationMethod as Service["reviews"][number]["verificationMethod"],
      author: review.author,
      text: review.text,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export const serviceInclude = {
  provider: {
    select: {
      name: true,
      avatar: true,
      avatarTone: true,
    },
  },
  category: {
    select: {
      name: true,
    },
  },
  reviews: {
    orderBy: {
      createdAt: "desc" as const,
    },
    select: {
      id: true,
      sentiment: true,
      reviewScore: true,
      status: true,
      verificationMethod: true,
      author: true,
      text: true,
      createdAt: true,
    },
  },
};
