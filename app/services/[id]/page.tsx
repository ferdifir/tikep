"use client";

import { ArrowLeft, Copy, Edit3, Flag, Heart, Layers, LinkIcon, MessageCircle, PenLine, Save, Share2, ThumbsDown, ThumbsUp, Trash2, TrendingUp, Workflow } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import { EmptyState } from "@/components/empty-state";
import { useTikep } from "@/components/app-provider";
import { ServiceInquiryButton } from "@/components/service-inquiry-button";
import { formatCurrency } from "@/lib/format";
import { shareService } from "@/lib/share-links";
import { getLatestReviews, getProviderSlug, getRatingCircleStyle, hasRating } from "@/lib/service-utils";
import { getTelegramInitData } from "@/lib/telegram-webapp";
import type { IconMap } from "@/lib/types";

const iconMap: IconMap = {
  layers: Layers,
  "pen-line": PenLine,
  "trending-up": TrendingUp,
  workflow: Workflow,
};

type ReviewInviteInquiry = {
  id: string;
  status: string;
  customerLabel: string;
  createdAt: string;
  updatedAt: string;
  availableAt: string;
  canInvite: boolean;
  hasActiveInvite: boolean;
  inviteStatus: string | null;
  inviteError: string | null;
};

export default function ServicePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { services, categories, recommendedIds, reportedIds, toggleRecommendation, reportService, updateService, deleteService } = useTikep();
  const service = services.find((item) => item.id === params.id);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [reviewInquiries, setReviewInquiries] = useState<ReviewInviteInquiry[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!service || service.owner !== "me") {
      return;
    }

    const initData = getTelegramInitData();
    const url = initData
      ? `/api/services/${service.id}/review-invites?initData=${encodeURIComponent(initData)}`
      : `/api/services/${service.id}/review-invites`;

    fetch(url)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to load inquiries"))))
      .then((data: { inquiries: ReviewInviteInquiry[] }) => {
        setReviewInquiries(data.inquiries);
        setSelectedInquiryId((current) => current || data.inquiries[0]?.id || "");
      })
      .catch(() => setReviewInquiries([]));
  }, [service]);

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
  const showRating = hasRating(service.rating);
  const editCategoryOptions = categories.map((item) => ({ value: item, label: item }));
  const canSaveEdit =
    editTitle.trim().length >= 4 &&
    editCategory.trim().length >= 2 &&
    Number.isFinite(Number(editPrice)) &&
    Number(editPrice) > 0 &&
    editDescription.trim().length >= 12;

  function startEditing() {
    if (!service) {
      return;
    }

    setEditing(true);
    setEditStatus("");
    setEditError("");
    setEditTitle(service.title);
    setEditCategory(service.category);
    setEditPrice(String(service.price));
    setEditDescription(service.description);
  }

  async function handleUpdateService() {
    if (!service || !canSaveEdit) {
      return;
    }

    try {
      setEditStatus("");
      setEditError("");
      await updateService(service.id, {
        title: editTitle,
        category: editCategory,
        price: Number(editPrice),
        description: editDescription,
      });
      setEditing(false);
      setEditStatus("Produk/layanan diperbarui.");
    } catch (updateError) {
      setEditError(updateError instanceof Error ? updateError.message : "Produk/layanan gagal diperbarui.");
    }
  }

  async function handleDeleteService() {
    if (!service || !window.confirm("Hapus produk/layanan ini dari feed dan profil?")) {
      return;
    }

    try {
      setEditStatus("");
      setEditError("");
      await deleteService(service.id);
      router.replace("/profile");
    } catch (deleteError) {
      setEditError(deleteError instanceof Error ? deleteError.message : "Produk/layanan gagal dihapus.");
    }
  }

  async function handleCreateReviewInvite() {
    if (!service || !selectedInquiryId) {
      return;
    }

    setInviteError("");
    setInviteStatus("");

    const response = await fetch(`/api/services/${service.id}/review-invites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ initData: getTelegramInitData(), inquiryId: selectedInquiryId }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      setInviteError(errorData.error ?? "Gagal membuat link review.");
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
        ? "Invite review dikirim ke customer melalui bot."
        : "Invite review dibuat, tapi bot gagal mengirim. Bagikan link secara manual.",
    );
    setReviewInquiries((current) =>
      current.map((inquiry) =>
        inquiry.id === selectedInquiryId
          ? { ...inquiry, status: "REVIEW_INVITED", hasActiveInvite: true, canInvite: false, inviteStatus: data.invite.botMessageStatus }
          : inquiry,
      ),
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

  async function handleShareReviewInvite() {
    if (!inviteLink || !service) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Review ${service.title}`,
          text: `Beri review terverifikasi untuk ${service.title}`,
          url: inviteLink,
        });
      } else {
        await navigator.clipboard.writeText(inviteLink);
      }
      setInviteStatus("Link review siap dibagikan.");
    } catch {
      setInviteStatus("");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <button type="button" onClick={() => router.back()} className="rounded-full p-2 text-gray-700" aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-gray-900">Preview</span>
        {showRating ? (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
            style={getRatingCircleStyle(service.rating)}
            aria-label={`Rating ${service.rating.toFixed(1)}`}
          >
            {service.rating.toFixed(1)}
          </span>
        ) : (
          <span className="h-10 w-10" aria-hidden="true" />
        )}
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
          {service.coverUrl ? (
            <NextImage
              src={service.coverUrl}
              alt={`Preview ${service.title}`}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover"
            />
          ) : (
            <>
              <PreviewIcon className="mb-2 h-20 w-20 text-gray-300" />
              <span className="text-xs font-medium text-gray-500">{service.previewLabel}</span>
            </>
          )}
          <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs font-bold text-white">
            {formatCurrency(service.price)}
          </span>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">{service.category}</span>
            {service.owner === "me" ? (
              <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">Milik saya</span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-gray-600">{service.description}</p>

          <ServiceInquiryButton service={service} />

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
            <>
              <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-gray-900">Kelola produk/layanan</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteService}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50"
                    aria-label="Hapus produk/layanan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Judul</span>
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Kategori</span>
                        <CustomSelect
                          value={editCategory}
                          onChange={setEditCategory}
                          options={editCategoryOptions}
                          buttonClassName="h-10 bg-white text-xs"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Harga</span>
                        <input
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                          inputMode="numeric"
                          type="number"
                          min="1"
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>
                    </div>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Deskripsi</span>
                      <textarea
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateService}
                        disabled={!canSaveEdit}
                        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <Save className="h-4 w-4" />
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit detail
                  </button>
                )}
                {editStatus ? <p className="text-xs font-semibold text-emerald-700">{editStatus}</p> : null}
                {editError ? <p className="text-xs font-semibold text-rose-600">{editError}</p> : null}
              </section>

              <section className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-bold text-gray-900">Invite review customer</h2>
                </div>
              {reviewInquiries.length ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-indigo-700">Customer</span>
                  <CustomSelect
                    value={selectedInquiryId}
                    onChange={setSelectedInquiryId}
                    buttonClassName="h-10 border-indigo-100 text-xs"
                    options={reviewInquiries.map((inquiry) => ({
                      value: inquiry.id,
                      label: inquiry.customerLabel,
                      description: inquiry.hasActiveInvite
                        ? "invite aktif"
                        : inquiry.canInvite
                          ? "siap invite"
                          : `siap ${new Date(inquiry.availableAt).toLocaleDateString("id-ID")}`,
                    }))}
                  />
                </label>
              ) : (
                <p className="text-xs font-semibold leading-5 text-indigo-700">
                  Belum ada customer yang diterima dari tombol Pesan.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCreateReviewInvite}
                  disabled={!reviewInquiries.find((inquiry) => inquiry.id === selectedInquiryId)?.canInvite}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white transition hover:bg-indigo-700"
                >
                  <LinkIcon className="h-4 w-4" />
                  Kirim invite
                </button>
                <button
                  type="button"
                  onClick={handleShareReviewInvite}
                  disabled={!inviteLink}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
              {selectedInquiryId ? (
                <p className="text-xs font-semibold leading-5 text-indigo-700">
                  {(() => {
                    const selectedInquiry = reviewInquiries.find((inquiry) => inquiry.id === selectedInquiryId);
                    if (!selectedInquiry) {
                      return "";
                    }
                    if (selectedInquiry.hasActiveInvite) {
                      return "Customer ini sudah punya invite review aktif.";
                    }
                    if (!selectedInquiry.canInvite) {
                      return `Invite bisa dikirim setelah ${new Date(selectedInquiry.availableAt).toLocaleString("id-ID")}.`;
                    }
                    if (selectedInquiry.inviteError) {
                      return selectedInquiry.inviteError;
                    }
                    return "Customer ini sudah melewati jeda penggunaan dan siap diminta review.";
                  })()}
                </p>
              ) : null}
              {inviteStatus ? <p className="text-xs font-semibold text-indigo-700">{inviteStatus}</p> : null}
              {inviteError ? <p className="text-xs font-semibold text-rose-600">{inviteError}</p> : null}
              {inviteLink ? (
                <a
                  href={inviteLink}
                  className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs font-semibold text-indigo-700"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  <span className="truncate">{inviteLink}</span>
                </a>
              ) : null}
              </section>
            </>
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
