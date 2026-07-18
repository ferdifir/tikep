"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { getTelegramStartParam } from "@/lib/telegram-webapp";

function getStartParamFromTelegram() {
  return getTelegramStartParam();
}

function TelegramStartRouterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    queueMicrotask(() => {
      const startParam = searchParams.get("tgWebAppStartParam") ?? getStartParamFromTelegram();

      if (startParam.startsWith("service_")) {
        router.replace(`/services/${startParam.slice("service_".length)}`);
        return;
      }

      if (startParam.startsWith("media_")) {
        router.replace(`/media/${startParam.slice("media_".length)}`);
        return;
      }

      if (startParam.startsWith("review_")) {
        router.replace(`/review?code=${encodeURIComponent(startParam.slice("review_".length))}`);
      }
    });
  }, [router, searchParams]);

  return null;
}

export function TelegramStartRouter() {
  return (
    <Suspense fallback={null}>
      <TelegramStartRouterInner />
    </Suspense>
  );
}
