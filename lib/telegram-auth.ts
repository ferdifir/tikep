import "server-only";
import crypto from "node:crypto";

type TelegramUserPayload = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
};

export type ValidatedTelegramInitData = {
  queryId?: string;
  authDate: Date;
  hash: string;
  rawInitData: string;
  user: TelegramUserPayload;
};

export function validateTelegramInitData(initData: string, botToken: string): ValidatedTelegramInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = params.get("auth_date");
  const userJson = params.get("user");

  if (!hash || !authDate || !userJson) {
    throw new Error("Invalid Telegram initData.");
  }

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (
    calculatedHash.length !== hash.length ||
    !crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash))
  ) {
    throw new Error("Telegram initData hash mismatch.");
  }

  const authTimestamp = Number(authDate);

  if (!Number.isFinite(authTimestamp)) {
    throw new Error("Invalid Telegram auth_date.");
  }

  const maxAgeSeconds = 60 * 60 * 24;
  const ageSeconds = Math.floor(Date.now() / 1000) - authTimestamp;

  if (ageSeconds > maxAgeSeconds) {
    throw new Error("Telegram initData expired.");
  }

  return {
    queryId: params.get("query_id") ?? undefined,
    authDate: new Date(authTimestamp * 1000),
    hash,
    rawInitData: initData,
    user: JSON.parse(userJson) as TelegramUserPayload,
  };
}
