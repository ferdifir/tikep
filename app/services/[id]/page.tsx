"use client";

import { ArrowLeft, Flag, Heart, Layers, LinkIcon, MessageCircle, PenLine, Send, Share2, ThumbsDown, ThumbsUp, TrendingUp, Workflow } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useTikep } from "@/components/app-provider";
import { formatCurrency } from "@/lib/format";
import { shareService } from "@/lib/share-links";
import { getLatestReviews, getProviderSlug, getRatingCircleStyle } from "@/lib/service-utils";
import type { IconMap } from "@/lib/types";

const iconMap: IconMap = {
  layers: Layers,
  "pen-line": PenLine,
  "trending-up": TrendingUp,
  workflow: Workflow,
};

export default function ServicePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { services, recommendedIds, reportedIds, toggleRecommendation, reportService } = useTikep();
  const service = services.find((item) => item.id === params.id);
  const [customerChatId, setCustomerChatId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  if (!service) {
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
        <EmptyState title="Preview tidak ditemukan" body="Layanan atau produk ini tidak tersedia di data saat ini." />
      </div>
    );
  }

  const PreviewIcon = iconMap[service.iconName] ?? Layers;
  const recommended = recommendedIds.includes(service.id);
  const reported = reportedIds.includes(service.id);
  const reviews = getLatestReviews(service.reviews);

  async function handleCreateReviewInvite() {
    if (!service) {
      return;
    }

    setInviteError("");
    setInviteStatus("");

    const response = await fetch(`/api/services/${service.id}/review-invites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerChatId: customerChatId.trim() || undefined,
      }),
    });

    if (!response.ok) {
      setInviteError("Gagal membuat link review.");
      return;
    }

    const data = (await response.json()) as {
      invite: {
        reviewUrl: string;
        telegramUrl: string | null;
        botMessageStatus: string;
      };
    };
    setInviteLink(data.invite.telegramUrl ?? data.invite.reviewUrl);
    setInviteStatus(
      data.invite.botMessageStatus === "sent"
        ? "Bot sudah mengirim link review."
        : data.invite.botMessageStatus === "not_configured"
          ? "Link dibuat. Bot token belum dikonfigurasi untuk kirim otomatis."
          : data.invite.botMessageStatus === "failed"
            ? "Link dibuat, tapi bot gagal mengirim pesan."
            : "Link review dibuat.",
    );
  }

  async function handleShareService() {
    if (!service) {
      return;
    }

    try {
      await shareService({ id: service.id, title: service.title });
      setShareStatus("Link disalin");
      window.setTimeout(() => setShareStatus(""), 1800);
    } catch {
      setShareStatus("");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <button type="button" onClick={() => router.back()} className="rounded-full p-2 text-gray-700" aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-gray-900">Preview</span>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
          style={getRatingCircleStyle(service.rating)}
          aria-label={`Rating ${service.rating.toFixed(1)}`}
        >
          {service.rating.toFixed(1)}
        </span>
      </header>

      <article className="m-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 p-3">
          <Link href={`/providers/${getProviderSlug(service.provider)}`} className="flex min-w-0 items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${service.avatarTone}`}>
              {service.avatar}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">{service.title}</h1>
              <span className="text-xs text-gray-500">Oleh {service.provider}</span>
            </div>
          </Link>
        </div>

        <div className="relative flex aspect-square flex-col items-center justify-center border-y border-gray-100 bg-slate-100 p-4 text-gray-400">
          <PreviewIcon className="mb-2 h-20 w-20 text-gray-300" />
          <span className="text-xs font-medium text-gray-500">{service.previewLabel}</span>
          <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs font-bold text-white">
            {formatCurrency(service.price)}
          </span>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">{service.category}</span>
            {service.owner === "me" ? (
              <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">Layanan saya</span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-gray-600">{service.description}</p>

          <div className="grid grid-cols-3 items-center border-y border-gray-100 py-3">
            <button
              type="button"
              onClick={() => toggleRecommendation(service.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold transition ${
                recommended ? "text-emerald-600" : "text-gray-500 hover:text-emerald-600"
              }`}
            >
              <Heart className={`h-4 w-4 ${recommended ? "fill-emerald-500 text-emerald-500" : ""}`} />
              <span>{recommended ? "Direkomendasikan" : "Rekomendasikan"}</span>
            </button>
            <button
              type="button"
              onClick={handleShareService}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-indigo-600"
            >
              <Share2 className="h-4 w-4" />
              <span>{shareStatus || "Share"}</span>
            </button>
            <button
              type="button"
              onClick={() => reportService(service.id)}
              className={`flex items-center justify-end gap-1.5 text-xs font-semibold transition ${
                reported ? "text-rose-600" : "text-gray-400 hover:text-rose-600"
              }`}
            >
              <Flag className="h-4 w-4" />
              <span>{reported ? "Dilaporkan" : "Laporkan"}</span>
            </button>
          </div>

          {service.owner === "me" ? (
            <section className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-gray-900">Invite review customer</h2>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={customerChatId}
                  onChange={(event) => setCustomerChatId(event.target.value)}
                  placeholder="Telegram chat_id customer"
                  className="h-10 rounded-lg border border-indigo-100 bg-white px-3 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={handleCreateReviewInvite}
                  className="flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-3 text-white transition hover:bg-indigo-700"
                  aria-label="Kirim link review"
                  title="Kirim link review"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {inviteStatus ? <p className="text-xs font-semibold text-indigo-700">{inviteStatus}</p> : null}
              {inviteError ? <p className="text-xs font-semibold text-rose-600">{inviteError}</p> : null}
              {inviteLink ? (
                <a
                  href={inviteLink}
                  className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs font-semibold text-indigo-700"
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{inviteLink}</span>
                </a>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Review</h2>
            <div className="space-y-2">
              {reviews.map((review) => (
                <div key={review.id} className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
                  {review.sentiment === "positive" ? (
                    <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <ThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <p className="leading-5">
                    <span className="font-semibold">{review.author}:</span> {review.text}
                    {typeof review.reviewScore === "number" ? (
                      <span className="ml-1 font-bold text-gray-500">Score AI {review.reviewScore.toFixed(1)}</span>
                    ) : null}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
