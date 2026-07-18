import type { LucideIcon } from "lucide-react";

export type ServiceCategory = string;

export type Review = {
  id: string;
  sentiment: "positive" | "negative";
  reviewScore?: number | null;
  status?: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  verificationMethod?: "NONE" | "PROVIDER_CODE" | "PROOF_UPLOAD" | "EXTERNAL_LINK" | "SEED";
  author: string;
  text: string;
  createdAt: string;
};

export type Service = {
  id: string;
  title: string;
  provider: string;
  avatar: string;
  avatarTone: string;
  category: ServiceCategory;
  price: number;
  rating: number;
  description: string;
  iconName: string;
  previewLabel: string;
  reviews: Review[];
  owner: "me" | "other";
  createdAt: string;
};

export type NewServiceInput = {
  title: string;
  provider: string;
  category: ServiceCategory;
  price: number;
  description: string;
};

export type IconMap = Record<string, LucideIcon>;
