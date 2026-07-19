import "server-only";

export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL wajib dikonfigurasi di production.");
  }

  return "file:./dev.db";
}

export function getDeveloperTelegramUserId() {
  return process.env.TELEGRAM_DEVELOPER_USER_ID?.trim() || null;
}

export function isTelegramAuthDebugEnabled() {
  return process.env.TELEGRAM_AUTH_DEBUG === "1";
}
