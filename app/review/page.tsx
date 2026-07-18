"use client";

import { CheckCircle2, MessageSquareText, ThumbsDown, ThumbsUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import type { Service } from "@/lib/types";

type InviteState = {
  id: string;
  status: string;
  expiresAt: string;
  usedAt: string | null;
  service: Service;
  provider: {
    name: string;
    avatar: string;
    avatarTone: string;
  };
};

function getTelegramStartParamCode() {
  if (typeof window === "undefined") {
    return "";
  }

  const telegram = (window as typeof window & {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          start_param?: string;
        };
      };
    };
  }).Telegram?.WebApp;
  const startParam = telegram?.initDataUnsafe?.start_param ?? new URLSearchParams(window.location.search).get("tgWebAppStartParam") ?? "";

  return startParam.startsWith("review_") ? startParam.slice("review_".length) : startParam;
}

function ReviewInviteContent() {
  const searchParams = useSearchParams();
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [sentiment, setSentiment] = useState<"positive" | "negative">("positive");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const code = useMemo(() => searchParams.get("code") ?? getTelegramStartParamCode(), [searchParams]);

  useEffect(() => {
    queueMicrotask(() => {
      if (!code) {
        setLoading(false);
        return;
      }

      fetch(`/api/reviews/invite?code=${encodeURIComponent(code)}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Invite not found"))))
        .then((data: { invite: InviteState }) => setInvite(data.invite))
        .catch(() => setError("Link review tidak valid atau sudah tidak tersedia."))
        .finally(() => setLoading(false));
    });
  }, [code]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code || text.trim().length < 8) {
      setError("Review minimal 8 karakter.");
      return;
    }

    const telegram = (window as typeof window & {
      Telegram?: {
        WebApp?: {
          initData?: string;
        };
      };
    }).Telegram?.WebApp;

    const response = await fetch("/api/reviews/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        sentiment,
        text,
        initData: telegram?.initData,
      }),
    });

    if (!response.ok) {
      setError("Review gagal dikirim. Link mungkin sudah pernah dipakai.");
      return;
    }

    setSubmitted(true);
    setError("");
  }

  if (loading) {
    return <div className="p-4 text-sm font-semibold text-gray-500">Memuat link review...</div>;
  }

  if (!invite) {
    return (
      <div className="p-4">
        <EmptyState title="Link review tidak valid" body={error || "Minta link baru dari penyedia produk atau jasa."} />
      </div>
    );
  }

  if (invite.status !== "ACTIVE" || invite.usedAt) {
    return (
      <div className="p-4">
        <EmptyState title="Link sudah dipakai" body="Kode review ini hanya bisa dipakai satu kali." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <section className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full font-bold ${invite.provider.avatarTone}`}>
            {invite.provider.avatar}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-gray-900">{invite.service.title}</h1>
            <p className="text-xs text-gray-500">Review terverifikasi untuk {invite.provider.name}</p>
          </div>
        </div>

        {submitted ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Review berhasil dikirim sebagai review terverifikasi.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSentiment("positive")}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-bold ${
                  sentiment === "positive"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                Positif
              </button>
              <button
                type="button"
                onClick={() => setSentiment("negative")}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-bold ${
                  sentiment === "negative"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                Negatif
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Review</span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={6}
                placeholder="Ceritakan pengalaman memakai produk atau jasa ini."
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <MessageSquareText className="h-4 w-4" />
              Kirim Review
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export default function ReviewInvitePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm font-semibold text-gray-500">Memuat link review...</div>}>
      <ReviewInviteContent />
    </Suspense>
  );
}
