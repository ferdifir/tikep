import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { sendTelegramMessage } from "@/lib/telegram-bot";

function getUserLabel(user: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  telegramId: string | null;
}) {
  return user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || user.telegramId || "User Tikep";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = (await request.json().catch(() => ({}))) as { initData?: string; message?: string };
  const [{ id }, customer] = await Promise.all([
    params,
    getUserFromInitDataOrDemo(body.initData).catch((error) => {
      const response = authErrorResponse(error);
      if (response) {
        return response;
      }
      throw error;
    }),
  ]);

  if (customer instanceof NextResponse) {
    return customer;
  }

  if (!customer.botStartedAt || !customer.telegramChatId) {
    return NextResponse.json(
      {
        code: "CUSTOMER_BOT_NOT_CONNECTED",
        error: "Hubungkan bot Tikep terlebih dahulu sebelum pesan layanan.",
      },
      { status: 403 },
    );
  }

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      provider: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  const providerUser = service.provider.owner;

  if (!providerUser?.telegramChatId || !providerUser.botStartedAt || !providerUser.username) {
    return NextResponse.json({ error: "Provider belum bisa menerima pesan." }, { status: 409 });
  }

  if (providerUser.id === customer.id) {
    return NextResponse.json({ error: "Kamu tidak bisa memesan layanan sendiri." }, { status: 409 });
  }

  const message = body.message?.trim() || null;
  const inquiry = await prisma.serviceInquiry.upsert({
    where: {
      serviceId_customerUserId: {
        serviceId: service.id,
        customerUserId: customer.id,
      },
    },
    update: {
      status: "REQUESTED",
      message,
      providerRespondedAt: null,
      customerNotifiedAt: null,
    },
    create: {
      serviceId: service.id,
      providerId: service.providerId,
      customerUserId: customer.id,
      message,
    },
  });

  const notification = await sendTelegramMessage({
    chatId: providerUser.telegramChatId,
    text: [
      "Ada user ingin pesan layanan Tikep.",
      `Layanan: ${service.title}`,
      `Customer: ${getUserLabel(customer)}`,
      message ? `Pesan: ${message}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    replyMarkup: {
      inline_keyboard: [
        [
          { text: "Terima", callback_data: `inquiry_accept:${inquiry.id}` },
          { text: "Tolak", callback_data: `inquiry_reject:${inquiry.id}` },
        ],
      ],
    },
  });

  if (notification.status === "sent" && notification.messageId) {
    await prisma.serviceInquiry.update({
      where: { id: inquiry.id },
      data: { providerMessageId: notification.messageId },
    });
  }

  return NextResponse.json({
    inquiry: {
      id: inquiry.id,
      status: inquiry.status,
      notificationStatus: notification.status,
    },
  });
}
