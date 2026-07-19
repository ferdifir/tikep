"use client";

import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { getBotStartUrl, getTelegramInitData } from "@/lib/telegram-webapp";
import type { Service } from "@/lib/types";

export function ServiceInquiryButton({ service, compact = false }: { service: Service; compact?: boolean }) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const botStartUrl = getBotStartUrl("bind_customer");

  if (service.owner === "me") {
    return null;
  }

  async function handleInquiry() {
    try {
      setError("");
      setStatus("");
      setIsSubmitting(true);

      const response = await fetch(`/api/services/${service.id}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: getTelegramInitData() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
        inquiry?: {
          notificationStatus?: string;
        };
      };

      if (!response.ok) {
        if (data.code === "CUSTOMER_BOT_NOT_CONNECTED") {
          setShowConnectDialog(true);
          return;
        }

        throw new Error(data.error ?? "Permintaan gagal dikirim.");
      }

      setStatus(data.inquiry?.notificationStatus === "sent" ? "Permintaan dikirim" : "Tersimpan, notif bot gagal");
      window.setTimeout(() => setStatus(""), 1800);
    } catch (inquiryError) {
      setError(inquiryError instanceof Error ? inquiryError.message : "Permintaan gagal dikirim.");
      window.setTimeout(() => setError(""), 2400);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInquiry}
        disabled={isSubmitting}
        className={
          compact
            ? "flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:text-gray-300"
            : "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-gray-300"
        }
      >
        <MessageCircle className="h-4 w-4" />
        <span>{status || (isSubmitting ? "Mengirim" : "Pesan")}</span>
      </button>
      {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}

      {showConnectDialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Hubungkan bot</h2>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Start bot Tikep dulu agar provider bisa menerima permintaan dan kamu bisa menerima balasan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectDialog(false)}
                className="rounded-full p-1 text-gray-500"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {botStartUrl ? (
              <a
                href={botStartUrl}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
              >
                Hubungkan
              </a>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
                Username bot belum dikonfigurasi.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
