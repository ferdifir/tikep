import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTelegramInitData } from "@/lib/telegram-auth";
import { logTelegramAuthDebug } from "@/lib/telegram-auth-debug";

export async function POST(request: Request) {
  const body = (await request.json()) as { initData?: string };
  const initData = body.initData?.trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN belum dikonfigurasi." }, { status: 501 });
  }

  if (!initData) {
    return NextResponse.json({ error: "initData wajib dikirim." }, { status: 400 });
  }

  try {
    const validated = validateTelegramInitData(initData, botToken);
    const expiresAt = new Date(validated.authDate.getTime() + 24 * 60 * 60 * 1000);
    const user = await prisma.user.upsert({
      where: {
        telegramId: String(validated.user.id),
      },
      update: {
        username: validated.user.username,
        firstName: validated.user.first_name,
        lastName: validated.user.last_name,
        photoUrl: validated.user.photo_url,
        languageCode: validated.user.language_code,
      },
      create: {
        telegramId: String(validated.user.id),
        username: validated.user.username,
        firstName: validated.user.first_name,
        lastName: validated.user.last_name,
        photoUrl: validated.user.photo_url,
        languageCode: validated.user.language_code,
      },
    });

    await prisma.telegramSession.create({
      data: {
        userId: user.id,
        queryId: validated.queryId,
        authDate: validated.authDate,
        hash: validated.hash,
        rawInitData: validated.rawInitData,
        expiresAt,
      },
    });

    logTelegramAuthDebug({
      event: "session_created",
      telegramId: validated.user.id,
      username: validated.user.username,
      authDate: validated.authDate,
      expiresAt,
      hasTelegramChatId: Boolean(user.telegramChatId),
      hasBotStartedAt: Boolean(user.botStartedAt),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        telegramChatId: user.telegramChatId,
        botStartedAt: user.botStartedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    logTelegramAuthDebug({
      event: "session_invalid",
      error: error instanceof Error ? error.message : "Unknown Telegram session error",
    });
    return NextResponse.json({ error: "initData Telegram tidak valid." }, { status: 401 });
  }
}
