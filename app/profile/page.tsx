"use client";

import { Heart, RefreshCw, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ProfileServiceGrid } from "@/components/profile-service-grid";
import { useTikep } from "@/components/app-provider";
import { TikepLogo } from "@/components/tikep-logo";

export default function ProfilePage() {
  const { services, recommendedIds, reportedIds, resetDemoData } = useTikep();
  const myServices = services.filter((service) => service.owner === "me");
  const recommendedServices = services.filter((service) => recommendedIds.includes(service.id));

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <TikepLogo showWordmark={false} iconClassName="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900">Tikep Studio</h1>
            <p className="text-sm text-gray-500">Kreator layanan digital</p>
          </div>
          <button
            type="button"
            onClick={resetDemoData}
            aria-label="Reset data demo"
            title="Reset data demo"
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:text-gray-900"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white p-3">
            <p className="text-lg font-bold text-gray-900">{myServices.length}</p>
            <p className="text-[11px] font-medium text-gray-500">Post</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-lg font-bold text-emerald-600">{recommendedIds.length}</p>
            <p className="text-[11px] font-medium text-gray-500">Rekomendasi</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-lg font-bold text-rose-600">{reportedIds.length}</p>
            <p className="text-[11px] font-medium text-gray-500">Laporan</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Layanan saya</h2>
        </div>
        {myServices.length ? (
          <ProfileServiceGrid services={myServices} />
        ) : (
          <EmptyState title="Belum ada layanan" body="Buat layanan pertama dari tab Post." />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-gray-900">Direkomendasikan</h2>
        </div>
        {recommendedServices.length ? (
          <ProfileServiceGrid services={recommendedServices} />
        ) : (
          <EmptyState title="Belum ada rekomendasi" body="Tekan rekomendasikan pada layanan yang menurut Anda layak." />
        )}
      </section>
    </div>
  );
}
