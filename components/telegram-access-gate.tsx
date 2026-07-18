"use client";

import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { TikepLogo } from "@/components/tikep-logo";
import { getMiniAppUrlForCurrentPath, getTelegramInitData } from "@/lib/telegram-webapp";

export function TelegramAccessGate({ children }: { children: React.ReactNode }) {
  const [isAllowed, setIsAllowed] = useState(process.env.NODE_ENV !== "production");
  const [miniAppUrl, setMiniAppUrl] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      if (process.env.NODE_ENV !== "production") {
        setIsAllowed(true);
        return;
      }

      const initData = getTelegramInitData();
      setIsAllowed(Boolean(initData));
      setMiniAppUrl(getMiniAppUrlForCurrentPath());
    });
  }, []);

  if (isAllowed) {
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 text-center">
      <section className="w-full max-w-sm space-y-5">
        <div className="flex justify-center">
          <TikepLogo iconClassName="h-16 w-16" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black text-gray-900">Buka lewat Telegram</h1>
          <p className="text-sm leading-6 text-gray-500">
            Tikep hanya bisa diakses melalui Telegram Mini App agar akun, review, gift, dan wallet terhubung ke user Telegram yang valid.
          </p>
        </div>
        {miniAppUrl ? (
          <a
            href={miniAppUrl}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
          >
            <Send className="h-4 w-4" />
            Buka Mini App
          </a>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            Username bot belum dikonfigurasi.
          </div>
        )}
      </section>
    </main>
  );
}
