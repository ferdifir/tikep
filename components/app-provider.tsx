"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { seedServices } from "@/lib/seed-data";
import type { NewServiceInput, Service } from "@/lib/types";

type AppContextValue = {
  currentUser: CurrentUser;
  services: Service[];
  categories: string[];
  recommendedIds: string[];
  reportedIds: string[];
  homeFiltersOpen: boolean;
  toggleHomeFilters: () => void;
  toggleRecommendation: (serviceId: string) => void;
  reportService: (serviceId: string) => void;
  addService: (input: NewServiceInput) => Promise<Service>;
  addCategory: (name: string) => Promise<string>;
  resetDemoData: () => void;
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
};

const defaultState: StoredState = {
  currentUser: {
    id: "demo",
    username: "tikep_demo",
    firstName: "Tikep",
    lastName: "Studio",
    photoUrl: null,
  },
  services: seedServices,
  categories: ["Desain", "Marketing", "Teknologi", "Konten"],
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

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/app-state")
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to load app state"))))
        .then((data: AppStateResponse) => setState(mapAppState(data)))
        .catch(() => setState(defaultState));
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser: state.currentUser,
      services: state.services,
      categories: state.categories,
      recommendedIds: state.recommendedIds,
      reportedIds: state.reportedIds,
      homeFiltersOpen,
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
        fetch(`/api/services/${serviceId}/recommend`, { method: "POST" }).catch(() => {
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
        fetch(`/api/services/${serviceId}/report`, { method: "POST" }).catch(() => {
          setState((current) => ({
            ...current,
            reportedIds: current.reportedIds.filter((id) => id !== serviceId),
          }));
        });
      },
      async addService(input) {
        const response = await fetch("/api/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error("Gagal menambahkan layanan.");
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
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          throw new Error("Gagal menambahkan kategori.");
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
      resetDemoData() {
        fetch("/api/demo/reset", { method: "POST" })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to reset demo data"))))
          .then((data: AppStateResponse) => setState(mapAppState(data)))
          .catch(() => setState(defaultState));
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
