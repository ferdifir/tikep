"use client";

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
  };
  ready?: () => void;
  expand?: () => void;
};

function getTelegramWebApp() {
  return (window as typeof window & {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }).Telegram?.WebApp;
}

export function getTelegramInitData() {
  return getTelegramWebApp()?.initData?.trim() || "";
}

export function getTelegramStartParam() {
  return getTelegramWebApp()?.initDataUnsafe?.start_param ?? "";
}

export function getStartParamForPath(pathname: string, search = "") {
  const reviewCode = new URLSearchParams(search).get("code");

  if (reviewCode) {
    return `review_${reviewCode}`;
  }

  const serviceMatch = pathname.match(/^\/services\/([^/]+)/);
  if (serviceMatch?.[1]) {
    return `service_${serviceMatch[1]}`;
  }

  const mediaMatch = pathname.match(/^\/media\/([^/]+)/);
  if (mediaMatch?.[1] && mediaMatch[1] !== "new") {
    return `media_${mediaMatch[1]}`;
  }

  return "";
}

export function getMiniAppUrlForCurrentPath() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    return "";
  }

  const startParam = getStartParamForPath(window.location.pathname, window.location.search);
  const baseUrl = `https://t.me/${botUsername}`;

  return startParam ? `${baseUrl}?startapp=${encodeURIComponent(startParam)}` : `${baseUrl}?startapp=home`;
}

export function getBotStartUrl(payload = "bind") {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");

  if (!botUsername) {
    return "";
  }

  return `https://t.me/${botUsername}?start=${encodeURIComponent(payload)}`;
}
