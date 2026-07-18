"use client";

import { Heart, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ProfileServiceGrid } from "@/components/profile-service-grid";
import { useTikep } from "@/components/app-provider";
import { TikepLogo } from "@/components/tikep-logo";

export default function ProfilePage() {
  const { services, recommendedIds, reportedIds, resetDemoData } = useTikep();
  const [wallet, setWallet] = useState<{ balance: number; pendingWithdraw: number; totalEarned: number } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [walletStatus, setWalletStatus] = useState("");
  const [walletError, setWalletError] = useState("");
  const myServices = services.filter((service) => service.owner === "me");
  const recommendedServices = services.filter((service) => recommendedIds.includes(service.id));

  useEffect(() => {
    fetch("/api/wallet")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to load wallet"))))
      .then((data: { wallet: { balance: number; pendingWithdraw: number; totalEarned: number } }) => setWallet(data.wallet))
      .catch(() => setWallet(null));
  }, []);

  async function handleWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setWalletError("");
      setWalletStatus("");
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          payoutDetails,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Withdraw gagal dibuat.");
      }

      const walletResponse = await fetch("/api/wallet");
      const walletData = (await walletResponse.json()) as { wallet: { balance: number; pendingWithdraw: number; totalEarned: number } };
      setWallet(walletData.wallet);
      setWithdrawAmount("");
      setPayoutDetails("");
      setWalletStatus("Request withdraw dikirim ke developer.");
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Withdraw gagal dibuat.");
    }
  }

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

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Wallet gift</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold text-gray-900">Rp{(wallet?.balance ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-[11px] font-medium text-gray-500">Saldo</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold text-amber-600">Rp{(wallet?.pendingWithdraw ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-[11px] font-medium text-gray-500">Pending</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold text-emerald-600">Rp{(wallet?.totalEarned ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-[11px] font-medium text-gray-500">Total</p>
          </div>
        </div>

        <form onSubmit={handleWithdraw} className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <input
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              inputMode="numeric"
              type="number"
              min="10000"
              placeholder="Nominal"
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <input
              value={payoutDetails}
              onChange={(event) => setPayoutDetails(event.target.value)}
              placeholder="Bank/e-wallet dan nomor"
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="submit"
            className="h-10 w-full rounded-lg bg-indigo-600 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Withdraw manual
          </button>
        </form>

        {walletStatus ? <p className="text-xs font-semibold text-emerald-600">{walletStatus}</p> : null}
        {walletError ? <p className="text-xs font-semibold text-rose-600">{walletError}</p> : null}
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
