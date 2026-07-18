"use client";

import { ArrowLeft, Banknote, Clock, Gift, Loader2, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getTelegramInitData } from "@/lib/telegram-webapp";
import { formatRupiah, getWithdrawMethod, withdrawMethods } from "@/lib/withdraw-methods";

type WalletResponse = {
  wallet: {
    balance: number;
    pendingWithdraw: number;
    totalEarned: number;
  };
  withdraws: {
    id: string;
    amount: number;
    method: string;
    accountName: string;
    accountNumber: string;
    adminFee: number;
    netAmount: number;
    status: string;
    createdAt: string;
  }[];
  receivedGifts: {
    id: string;
    orderId: string;
    mediaId: string;
    amount: number;
    completedAt: string | null;
    senderUser: {
      username: string | null;
      firstName: string | null;
      lastName: string | null;
    };
  }[];
};

function getSenderName(user: WalletResponse["receivedGifts"][number]["senderUser"]) {
  return user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || "User Tikep";
}

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<WalletResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"gifts" | "withdraws">("gifts");
  const [methodId, setMethodId] = useState(withdrawMethods[0].id);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMethod = useMemo(() => getWithdrawMethod(methodId) ?? withdrawMethods[0], [methodId]);
  const numericAmount = Number(amount) || 0;
  const netAmount = Math.max(numericAmount - selectedMethod.adminFee, 0);

  async function loadWallet() {
    const initData = getTelegramInitData();
    const url = initData ? `/api/wallet?initData=${encodeURIComponent(initData)}` : "/api/wallet";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Wallet gagal dimuat.");
    }
    const walletData = (await response.json()) as WalletResponse;
    setData(walletData);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadWallet().catch(() => setData(null));
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError("");
      setStatus("");
      setIsSubmitting(true);
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: methodId,
          accountName,
          accountNumber,
          amount: numericAmount,
          initData: getTelegramInitData(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Pencairan gagal diajukan.");
      }

      await loadWallet();
      setAmount("");
      setAccountName("");
      setAccountNumber("");
      setStatus("Pengajuan pencairan dikirim ke tim Tikep.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pencairan gagal diajukan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen space-y-4 bg-white p-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-gray-200 p-2 text-gray-700"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-gray-900">Wallet gift</h1>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      <section className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-bold text-gray-900">{formatRupiah(data?.wallet.balance ?? 0)}</p>
          <p className="text-[11px] font-medium text-gray-500">Saldo</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-bold text-amber-600">{formatRupiah(data?.wallet.pendingWithdraw ?? 0)}</p>
          <p className="text-[11px] font-medium text-gray-500">Diproses</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-bold text-emerald-600">{formatRupiah(data?.wallet.totalEarned ?? 0)}</p>
          <p className="text-[11px] font-medium text-gray-500">Total</p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Pencairan saldo</h2>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Metode</span>
          <select
            value={methodId}
            onChange={(event) => setMethodId(event.target.value as typeof methodId)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {withdrawMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Nama akun</span>
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{selectedMethod.accountLabel}</span>
            <input
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              inputMode="numeric"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Nominal pencairan</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            type="number"
            min={selectedMethod.minimumAmount}
            step="1000"
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Minimum</span>
            <span className="font-bold text-gray-900">{formatRupiah(selectedMethod.minimumAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Biaya admin</span>
            <span className="font-bold text-gray-900">{formatRupiah(selectedMethod.adminFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Estimasi diterima</span>
            <span className="font-bold text-emerald-600">{formatRupiah(netAmount)}</span>
          </div>
          <p className="text-xs leading-5 text-gray-500">{selectedMethod.note}</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-bold text-white disabled:bg-gray-300"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Ajukan pencairan
        </button>
        {status ? <p className="text-xs font-semibold text-emerald-600">{status}</p> : null}
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      </form>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("gifts")}
            className={`h-9 rounded-md text-sm font-bold ${activeTab === "gifts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Riwayat gift
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdraws")}
            className={`h-9 rounded-md text-sm font-bold ${activeTab === "withdraws" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Pencairan
          </button>
        </div>

        {activeTab === "gifts" ? (
          <div className="space-y-2">
            {data?.receivedGifts.length ? (
              data.receivedGifts.map((gift) => (
                <article key={gift.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <Gift className="h-4 w-4 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{formatRupiah(gift.amount)}</p>
                    <p className="truncate text-xs text-gray-500">Dari {getSenderName(gift.senderUser)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">Belum ada gift diterima.</div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {data?.withdraws.length ? (
              data.withdraws.map((withdraw) => (
                <article key={withdraw.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{formatRupiah(withdraw.netAmount)}</p>
                    <p className="truncate text-xs text-gray-500">
                      {withdraw.method} - {withdraw.status}
                    </p>
                  </div>
                  <WalletCards className="h-4 w-4 text-gray-400" />
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">Belum ada pengajuan pencairan.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
