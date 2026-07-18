"use client";

import { ArrowLeft, Gift, ImageIcon, Loader2, Play, Send, Share2, X } from "lucide-react";
import NextImage from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { shareMedia } from "@/lib/share-links";

type MediaPreview = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  altText: string;
  isAnonymous: boolean;
  authorUser: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

type GiftPayment = {
  orderId: string;
  amount: number;
  totalPayment: number | null;
  qrImageDataUrl: string | null;
  status: string;
  expiredAt: string;
};

function getDisplayUsername(user: NonNullable<MediaPreview["authorUser"]>) {
  if (user.username) {
    return `@${user.username}`;
  }

  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Tikep user";
}

export default function MediaPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<MediaPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftAmount, setGiftAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [giftPayment, setGiftPayment] = useState<GiftPayment | null>(null);
  const [isGiftLoading, setIsGiftLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [giftError, setGiftError] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    fetch(`/api/media/${params.id}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Media not found"))))
      .then((data: { media: MediaPreview }) => setMedia(data.media))
      .catch(() => setMedia(null))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (!media && !isLoading) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 rounded-full border border-gray-200 p-2 text-gray-700"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <EmptyState title="Media tidak ditemukan" body="Foto atau video ini tidak tersedia di data saat ini." />
      </div>
    );
  }

  const isVideo = media?.type === "VIDEO";
  const showVideoElement = isVideo && !media?.thumbnailUrl;
  const authorLabel = media?.authorUser ? getDisplayUsername(media.authorUser) : "";
  const canReceiveGift = Boolean(media && !media.isAnonymous && media.authorUser);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function handleShare() {
    if (!media) {
      return;
    }

    try {
      await shareMedia({ id: media.id });
      setShareStatus("Disalin");
      window.setTimeout(() => setShareStatus(""), 1600);
    } catch {
      setShareStatus("");
    }
  }

  async function createGiftPayment() {
    if (!media || isGiftLoading) {
      return;
    }

    const amount = customAmount ? Number(customAmount) : giftAmount;

    try {
      setGiftError("");
      setIsGiftLoading(true);
      const response = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id, amount }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Gift gagal dibuat.");
      }

      const data = (await response.json()) as { gift: GiftPayment };
      setGiftPayment(data.gift);
    } catch (error) {
      setGiftError(error instanceof Error ? error.message : "Gift gagal dibuat.");
    } finally {
      setIsGiftLoading(false);
    }
  }

  async function sendQrisViaBot() {
    if (!giftPayment || isGiftLoading) {
      return;
    }

    try {
      setGiftError("");
      setIsGiftLoading(true);
      const response = await fetch(`/api/gifts/${giftPayment.orderId}/send-qris`, { method: "POST" });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "QRIS gagal dikirim.");
      }

      showToast("QRIS dikirim melalui bot");
    } catch (error) {
      setGiftError(error instanceof Error ? error.message : "QRIS gagal dikirim.");
    } finally {
      setIsGiftLoading(false);
    }
  }

  async function checkGiftStatus() {
    if (!giftPayment || isGiftLoading) {
      return;
    }

    try {
      setGiftError("");
      setIsGiftLoading(true);
      const response = await fetch(`/api/gifts/${giftPayment.orderId}/status`);

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Status gift gagal dicek.");
      }

      const data = (await response.json()) as { gift: GiftPayment };
      setGiftPayment(data.gift);
      showToast(data.gift.status === "COMPLETED" ? "Gift sudah diterima" : "Pembayaran masih pending");
    } catch (error) {
      setGiftError(error instanceof Error ? error.message : "Status gift gagal dicek.");
    } finally {
      setIsGiftLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => router.back()} className="rounded-full bg-black/35 p-2 backdrop-blur" aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {canReceiveGift ? (
            <button
              type="button"
              onClick={() => setGiftOpen(true)}
              className="rounded-full bg-black/35 p-2 backdrop-blur"
              aria-label="Kirim gift"
            >
              <Gift className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full bg-black/35 p-2 backdrop-blur"
            aria-label="Share media"
            title={shareStatus || "Share"}
          >
            <Share2 className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-black/35 p-2 backdrop-blur" aria-label={isVideo ? "Video" : "Foto"}>
            {isVideo ? <Play className="h-5 w-5 fill-current" /> : <ImageIcon className="h-5 w-5" />}
          </span>
        </div>
      </header>

      <main className="relative min-h-screen">
        {media ? (
          showVideoElement ? (
            <video src={media.url} className="h-screen w-full object-contain" controls autoPlay muted playsInline />
          ) : (
            <NextImage
              src={media.thumbnailUrl ?? media.url}
              alt={media.altText}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-contain"
            />
          )
        ) : (
          <div className="h-screen w-full animate-pulse bg-gray-950" />
        )}
        {isVideo ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur">
              <Play className="ml-1 h-8 w-8 fill-white text-white" />
            </div>
          </div>
        ) : null}
        {authorLabel ? (
          <div className="absolute bottom-5 left-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            by {authorLabel}
          </div>
        ) : null}
      </main>

      {giftOpen ? (
        <div className="absolute inset-0 z-[60] flex items-end bg-black/45">
          <section className="w-full rounded-t-2xl bg-white p-4 text-gray-900 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Kirim gift</h2>
                <p className="text-xs text-gray-500">Untuk {authorLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setGiftOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Tutup gift"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {giftPayment?.qrImageDataUrl ? (
              <div className="space-y-3">
                <div className="mx-auto w-56 overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={giftPayment.qrImageDataUrl} alt="QRIS gift Tikep" className="h-auto w-full" />
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xs font-semibold uppercase text-gray-500">Total bayar</p>
                  <p className="text-lg font-bold text-gray-900">
                    Rp{(giftPayment.totalPayment ?? giftPayment.amount).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-gray-500">Status: {giftPayment.status}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={sendQrisViaBot}
                    disabled={isGiftLoading}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 disabled:text-gray-300"
                  >
                    <Send className="h-4 w-4" />
                    Kirim bot
                  </button>
                  <button
                    type="button"
                    onClick={checkGiftStatus}
                    disabled={isGiftLoading}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-bold text-white disabled:bg-gray-300"
                  >
                    {isGiftLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Cek status
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {[5000, 10000, 25000, 50000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setGiftAmount(amount);
                        setCustomAmount("");
                      }}
                      className={`h-10 rounded-lg border text-sm font-bold ${
                        giftAmount === amount && !customAmount
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {amount / 1000}k
                    </button>
                  ))}
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Nominal custom</span>
                  <input
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    inputMode="numeric"
                    type="number"
                    min="5000"
                    step="1000"
                    placeholder="Minimal 5000"
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={createGiftPayment}
                  disabled={isGiftLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-bold text-white disabled:bg-gray-300"
                >
                  {isGiftLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                  Bayar QRIS
                </button>
              </div>
            )}

            {giftError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {giftError}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {toast ? (
        <div className="absolute bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
