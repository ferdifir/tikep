"use client";

import { Heart, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ProfileServiceGrid } from "@/components/profile-service-grid";
import { useTikep } from "@/components/app-provider";
import { TikepLogo } from "@/components/tikep-logo";
import { getTelegramInitData } from "@/lib/telegram-webapp";

export default function ProfilePage() {
  const { currentUser, services, recommendedIds, reportedIds } = useTikep();
  const [wallet, setWallet] = useState<{ balance: number; pendingWithdraw: number; totalEarned: number } | null>(null);
  const myServices = services.filter((service) => service.owner === "me");
  const recommendedServices = services.filter((service) => recommendedIds.includes(service.id));
  const userDisplayName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ");
  const profileName = myServices[0]?.provider || userDisplayName || currentUser.username || "User Tikep";
  const profileSubtitle = currentUser.username ? `@${currentUser.username}` : "Kreator Tikep";

  useEffect(() => {
    const initData = getTelegramInitData();
    const url = initData ? `/api/wallet?initData=${encodeURIComponent(initData)}` : "/api/wallet";

    fetch(url)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to load wallet"))))
      .then((data: { wallet: { balance: number; pendingWithdraw: number; totalEarned: number } }) => setWallet(data.wallet))
      .catch(() => setWallet(null));
  }, []);

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <TikepLogo showWordmark={false} iconClassName="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-gray-900">{profileName}</h1>
            <p className="truncate text-sm text-gray-500">{profileSubtitle}</p>
          </div>
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

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-900">Wallet gift</h2>
          </div>
          <Link href="/wallet" className="text-xs font-bold text-indigo-600">
            Detail
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold text-gray-900">Rp{(wallet?.balance ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-[11px] font-medium text-gray-500">Saldo tersedia</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold text-emerald-600">Rp{(wallet?.totalEarned ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-[11px] font-medium text-gray-500">Total diterima</p>
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
