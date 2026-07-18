"use client";

import { Heart, Inbox, Send, ShieldCheck, Wallet } from "lucide-react";
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
  const [inquiries, setInquiries] = useState<{
    providerInquiries: InquiryItem[];
    customerInquiries: InquiryItem[];
  }>({ providerInquiries: [], customerInquiries: [] });
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

    const inquiriesUrl = initData ? `/api/inquiries?initData=${encodeURIComponent(initData)}` : "/api/inquiries";

    fetch(inquiriesUrl)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to load inquiries"))))
      .then((data: { providerInquiries: InquiryItem[]; customerInquiries: InquiryItem[] }) => setInquiries(data))
      .catch(() => setInquiries({ providerInquiries: [], customerInquiries: [] }));
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
          <Inbox className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Order masuk</h2>
        </div>
        {inquiries.providerInquiries.length ? (
          <InquiryList items={inquiries.providerInquiries} mode="provider" />
        ) : (
          <EmptyState title="Belum ada order masuk" body="Order dari tombol Pesan akan muncul di sini." />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-cyan-600" />
          <h2 className="text-sm font-bold text-gray-900">Riwayat pesan</h2>
        </div>
        {inquiries.customerInquiries.length ? (
          <InquiryList items={inquiries.customerInquiries} mode="customer" />
        ) : (
          <EmptyState title="Belum ada pesan" body="Layanan yang kamu pesan akan tampil di sini." />
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

type InquiryItem = {
  id: string;
  status: string;
  message: string | null;
  service: {
    id: string;
    title: string;
  };
  providerName: string;
  providerLabel: string;
  customerLabel: string;
  providerNotificationStatus: string | null;
  providerNotificationError: string | null;
  customerNotificationStatus: string | null;
  customerNotificationError: string | null;
  providerRespondedAt: string | null;
  customerNotifiedAt: string | null;
  reviewInvitedAt: string | null;
  reviewInviteStatus: string | null;
  reviewInviteError: string | null;
  createdAt: string;
  updatedAt: string;
};

function getStatusLabel(status: string) {
  if (status === "REQUESTED") {
    return "Menunggu";
  }
  if (status === "ACCEPTED") {
    return "Diterima";
  }
  if (status === "REJECTED") {
    return "Ditolak";
  }
  if (status === "REVIEW_INVITED") {
    return "Review diminta";
  }
  return status;
}

function getStatusClass(status: string) {
  if (status === "ACCEPTED" || status === "REVIEW_INVITED") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "REJECTED") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-amber-50 text-amber-700";
}

function InquiryList({ items, mode }: { items: InquiryItem[]; mode: "provider" | "customer" }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const notificationError =
          mode === "provider" ? item.providerNotificationError : item.customerNotificationError ?? item.reviewInviteError;
        return (
          <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/services/${item.service.id}`} className="truncate text-sm font-bold text-gray-900">
                  {item.service.title}
                </Link>
                <p className="mt-1 truncate text-xs font-semibold text-gray-500">
                  {mode === "provider" ? `Customer ${item.customerLabel}` : `Provider ${item.providerLabel}`}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${getStatusClass(item.status)}`}>
                {getStatusLabel(item.status)}
              </span>
            </div>
            {item.message ? <p className="mt-2 text-xs leading-5 text-gray-600">{item.message}</p> : null}
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold text-gray-400">
              <span>{new Date(item.updatedAt).toLocaleString("id-ID")}</span>
              {notificationError ? <span className="text-right text-rose-600">Notif gagal, gunakan fallback manual</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
