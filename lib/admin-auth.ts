import "server-only";
import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { getInitDataFromRequestUrl, getUserFromInitDataOrDemo } from "@/lib/request-user";
import { getDeveloperTelegramUserId } from "@/lib/server-env";

export function isDeveloperUser(user: { telegramId: string | null }) {
  const developerTelegramUserId = getDeveloperTelegramUserId();
  return Boolean(developerTelegramUserId && user.telegramId && String(user.telegramId) === String(developerTelegramUserId));
}

export async function getDeveloperUserFromRequest(request: Request, initDataOverride?: string) {
  const initData = initDataOverride ?? getInitDataFromRequestUrl(request);
  const user = await getUserFromInitDataOrDemo(initData).catch((error) => {
    const response = authErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  });

  if (user instanceof NextResponse) {
    return user;
  }

  if (!isDeveloperUser(user)) {
    return NextResponse.json({ error: "Akses admin hanya untuk developer Tikep." }, { status: 403 });
  }

  return user;
}
