"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function getStartParamFromTelegram() {
  const telegram = (window as typeof window & {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          start_param?: string;
        };
      };
    };
  }).Telegram?.WebApp;

  return telegram?.initDataUnsafe?.start_param ?? "";
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
