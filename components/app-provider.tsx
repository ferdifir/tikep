"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { seedServices } from "@/lib/seed-data";
import type { NewServiceInput, Service } from "@/lib/types";

type AppContextValue = {
  services: Service[];
  recommendedIds: string[];
  reportedIds: string[];
  homeFiltersOpen: boolean;
  toggleHomeFilters: () => void;
  toggleRecommendation: (serviceId: string) => void;
  reportService: (serviceId: string) => void;
  addService: (input: NewServiceInput) => Service;
  resetDemoData: () => void;
};

const STORAGE_KEY = "tikep-app-state-v1";
const AppContext = createContext<AppContextValue | null>(null);

type StoredState = {
  services: Service[];
  recommendedIds: string[];
  reportedIds: string[];
};

const defaultState: StoredState = {
  services: seedServices,
  recommendedIds: [],
  reportedIds: [],
};

function persistState(nextState: StoredState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function normalizeStoredServices(services?: Service[]) {
  if (!services?.length) {
    return seedServices;
  }

  return services.map((service) => {
    const seedService = seedServices.find((item) => item.id === service.id);

    if (seedService) {
      return seedService;
    }

    return {
      ...service,
      reviews: service.reviews.map((review, index) => ({
        ...review,
        createdAt: review.createdAt ?? new Date(Date.now() - index * 60000).toISOString(),
      })),
    };
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(defaultState);
  const [homeFiltersOpen, setHomeFiltersOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredState;
          const storedState = {
            services: normalizeStoredServices(parsed.services),
            recommendedIds: parsed.recommendedIds ?? [],
            reportedIds: parsed.reportedIds ?? [],
          };
          setState(storedState);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      services: state.services,
      recommendedIds: state.recommendedIds,
      reportedIds: state.reportedIds,
      homeFiltersOpen,
      toggleHomeFilters() {
        setHomeFiltersOpen((current) => !current);
      },
      toggleRecommendation(serviceId) {
        setState((current) => {
          const next = {
            ...current,
            recommendedIds: current.recommendedIds.includes(serviceId)
              ? current.recommendedIds.filter((id) => id !== serviceId)
              : [...current.recommendedIds, serviceId],
          };
          persistState(next);
          return next;
        });
      },
      reportService(serviceId) {
        setState((current) => {
          const next = {
            ...current,
            reportedIds: current.reportedIds.includes(serviceId)
              ? current.reportedIds
              : [...current.reportedIds, serviceId],
          };
          persistState(next);
          return next;
        });
      },
      addService(input) {
        const now = Date.now();
        const avatar = input.provider
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const service: Service = {
          id: `${now}-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: input.title.trim(),
          provider: input.provider.trim(),
          avatar: avatar || "TK",
          avatarTone: "bg-violet-100 text-violet-700",
          category: input.category,
          price: input.price,
          rating: 4.2,
          description: input.description.trim(),
          iconName: input.category === "Teknologi" ? "workflow" : input.category === "Konten" ? "pen-line" : "layers",
          previewLabel: "Pratinjau Layanan Baru",
          owner: "me",
          createdAt: new Date().toISOString().slice(0, 10),
          reviews: [
            {
              id: `new-${now}-positive`,
              sentiment: "positive",
              author: "Tikep",
              text: "Layanan baru siap menerima rekomendasi pertama.",
              createdAt: new Date(now).toISOString(),
            },
            {
              id: `new-${now}-note`,
              sentiment: "negative",
              author: "Tikep",
              text: "Belum ada catatan kendala dari pembeli.",
              createdAt: new Date(now - 60000).toISOString(),
            },
          ],
        };

        setState((current) => {
          const next = {
            ...current,
            services: [service, ...current.services],
          };
          persistState(next);
          return next;
        });
        return service;
      },
      resetDemoData() {
        setState(defaultState);
        window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [homeFiltersOpen, state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useTikep() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useTikep must be used inside AppProvider");
  }

  return context;
}
