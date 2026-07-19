"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { seedServices } from "@/lib/seed-data";
import { getTelegramInitData } from "@/lib/telegram-webapp";
import type { NewServiceInput, Service } from "@/lib/types";

type AppContextValue = {
  currentUser: CurrentUser;
  services: Service[];
  categories: string[];
  recommendedIds: string[];
  reportedIds: string[];
  homeFiltersOpen: boolean;
  refreshAppState: () => Promise<void>;
  toggleHomeFilters: () => void;
  toggleRecommendation: (serviceId: string) => void;
  reportService: (serviceId: string) => void;
  addService: (input: NewServiceInput) => Promise<Service>;
  addCategory: (name: string) => Promise<string>;
};

const AppContext = createContext<AppContextValue | null>(null);

type StoredState = {
  currentUser: CurrentUser;
  services: Service[];
  categories: string[];
  recommendedIds: string[];
  reportedIds: string[];
};

type CurrentUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  telegramChatId: string | null;
  botStartedAt: string | null;
};

const defaultState: StoredState = {
  currentUser: {
    id: "demo",
    username: "tikep_demo",
    firstName: "Tikep",
    lastName: "Studio",
    photoUrl: null,
    telegramChatId: "demo-tikep-chat",
    botStartedAt: new Date(0).toISOString(),
  },
  services: seedServices,
  categories: [],
  recommendedIds: [],
  reportedIds: [],
};

type AppStateResponse = Omit<StoredState, "categories"> & {
  categories: { name: string }[];
};

function mapAppState(response: AppStateResponse): StoredState {
  return {
    currentUser: response.currentUser,
    services: response.services,
    categories: response.categories.map((category) => category.name),
    recommendedIds: response.recommendedIds,
    reportedIds: response.reportedIds,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(defaultState);
  const [homeFiltersOpen, setHomeFiltersOpen] = useState(false);

  const refreshAppState = useCallback(async () => {
    const initData = getTelegramInitData();
    const url = initData ? `/api/app-state?initData=${encodeURIComponent(initData)}` : "/api/app-state";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to load app state");
    }

    const data = (await response.json()) as AppStateResponse;
    setState(mapAppState(data));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refreshAppState().catch(() => setState(defaultState));
    });
  }, [refreshAppState]);

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser: state.currentUser,
      services: state.services,
      categories: state.categories,
      recommendedIds: state.recommendedIds,
      reportedIds: state.reportedIds,
      homeFiltersOpen,
      refreshAppState,
      toggleHomeFilters() {
        setHomeFiltersOpen((current) => !current);
      },
      toggleRecommendation(serviceId) {
        setState((current) => {
          return {
            ...current,
            recommendedIds: current.recommendedIds.includes(serviceId)
              ? current.recommendedIds.filter((id) => id !== serviceId)
              : [...current.recommendedIds, serviceId],
          };
        });
        fetch(`/api/services/${serviceId}/recommend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData: getTelegramInitData() }),
        }).catch(() => {
          setState((current) => ({
            ...current,
            recommendedIds: current.recommendedIds.includes(serviceId)
              ? current.recommendedIds.filter((id) => id !== serviceId)
              : [...current.recommendedIds, serviceId],
          }));
        });
      },
      reportService(serviceId) {
        setState((current) => {
          return {
            ...current,
            reportedIds: current.reportedIds.includes(serviceId)
              ? current.reportedIds
            : [...current.reportedIds, serviceId],
          };
        });
        fetch(`/api/services/${serviceId}/report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData: getTelegramInitData() }),
        }).catch(() => {
          setState((current) => ({
            ...current,
            reportedIds: current.reportedIds.filter((id) => id !== serviceId),
          }));
        });
      },
      async addService(input) {
        const formData = new FormData();
        formData.append("title", input.title);
        formData.append("provider", input.provider);
        formData.append("category", input.category);
        formData.append("price", String(input.price));
        formData.append("description", input.description);
        formData.append("coverFile", input.coverFile);
        formData.append("initData", getTelegramInitData());

        const response = await fetch("/api/services", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Gagal menambahkan layanan.");
        }

        const data = (await response.json()) as { service: Service };
        setState((current) => ({
          ...current,
          services: [data.service, ...current.services],
          categories: current.categories.includes(data.service.category)
            ? current.categories
            : [...current.categories, data.service.category],
        }));
        return data.service;
      },
      async addCategory(name) {
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, initData: getTelegramInitData() }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Gagal menambahkan kategori.");
        }

        const data = (await response.json()) as { category: { name: string } };
        setState((current) => ({
          ...current,
          categories: current.categories.includes(data.category.name)
            ? current.categories
            : [...current.categories, data.category.name],
        }));
        return data.category.name;
      },
    }),
    [homeFiltersOpen, refreshAppState, state],
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
