"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getTelegramInitData } from "@/lib/telegram-webapp";
import type { NewServiceInput, Service, UpdateServiceInput } from "@/lib/types";

type AppContextValue = {
  currentUser: CurrentUser;
  services: Service[];
  categories: string[];
  recommendedIds: string[];
  reportedIds: string[];
  isAppStateLoading: boolean;
  homeFiltersOpen: boolean;
  refreshAppState: () => Promise<void>;
  toggleHomeFilters: () => void;
  toggleRecommendation: (serviceId: string) => void;
  reportService: (serviceId: string) => void;
  addService: (input: NewServiceInput) => Promise<Service>;
  updateService: (serviceId: string, input: UpdateServiceInput) => Promise<Service>;
  deleteService: (serviceId: string) => Promise<void>;
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
    id: "",
    username: null,
    firstName: null,
    lastName: null,
    photoUrl: null,
    telegramChatId: null,
    botStartedAt: null,
  },
  services: [],
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
  const [isAppStateLoading, setIsAppStateLoading] = useState(true);
  const [homeFiltersOpen, setHomeFiltersOpen] = useState(false);
  const sessionSyncedRef = useRef(false);

  const refreshAppState = useCallback(async () => {
    setIsAppStateLoading(true);
    try {
      const initData = getTelegramInitData();
      const url = initData ? `/api/app-state?initData=${encodeURIComponent(initData)}` : "/api/app-state";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to load app state");
      }

      const data = (await response.json()) as AppStateResponse;
      setState(mapAppState(data));
    } finally {
      setIsAppStateLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const initData = getTelegramInitData();

      if (initData && !sessionSyncedRef.current) {
        sessionSyncedRef.current = true;
        fetch("/api/telegram/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        }).catch(() => undefined);
      }

      refreshAppState().catch(() => {
        setState(defaultState);
        setIsAppStateLoading(false);
      });
    });
  }, [refreshAppState]);

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser: state.currentUser,
      services: state.services,
      categories: state.categories,
      recommendedIds: state.recommendedIds,
      reportedIds: state.reportedIds,
      isAppStateLoading,
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
          throw new Error(data.error ?? "Gagal menambahkan produk/layanan.");
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
      async updateService(serviceId, input) {
        const formData = new FormData();
        formData.append("title", input.title);
        formData.append("category", input.category);
        formData.append("price", String(input.price));
        formData.append("description", input.description);
        formData.append("initData", getTelegramInitData());

        if (input.coverFile) {
          formData.append("coverFile", input.coverFile);
        }

        const response = await fetch(`/api/services/${serviceId}`, {
          method: "PATCH",
          body: formData,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Gagal memperbarui produk/layanan.");
        }

        const data = (await response.json()) as { service: Service };
        setState((current) => ({
          ...current,
          services: current.services.map((service) => (service.id === serviceId ? data.service : service)),
          categories: current.categories.includes(data.service.category)
            ? current.categories
            : [...current.categories, data.service.category],
        }));
        return data.service;
      },
      async deleteService(serviceId) {
        const response = await fetch(`/api/services/${serviceId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData: getTelegramInitData() }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Gagal menghapus produk/layanan.");
        }

        setState((current) => ({
          ...current,
          services: current.services.filter((service) => service.id !== serviceId),
          recommendedIds: current.recommendedIds.filter((id) => id !== serviceId),
          reportedIds: current.reportedIds.filter((id) => id !== serviceId),
        }));
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
    [homeFiltersOpen, isAppStateLoading, refreshAppState, state],
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
