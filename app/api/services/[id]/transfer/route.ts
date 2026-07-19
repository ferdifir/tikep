import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { sendTelegramMessage } from "@/lib/telegram-bot";

function userLabel(user: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  return user.username
    ? `@${user.username}`
    : [user.firstName, user.lastName].filter(Boolean).join(" ") || "User Tikep";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = (await request.json().catch(() => ({}))) as {
    initData?: string;
    targetUserId?: string;
  };
  const [{ id }, currentUser] = await Promise.all([
    params,
    getUserFromInitDataOrDemo(body.initData).catch((error) => {
      const response = authErrorResponse(error);
      if (response) return response;
      throw error;
    }),
  ]);

  if (currentUser instanceof NextResponse) return currentUser;

  if (!body.targetUserId) {
    return NextResponse.json({ error: "User tujuan wajib dipilih." }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { id, deletedAt: null },
    include: { provider: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Produk/layanan tidak ditemukan." }, { status: 404 });
  }

  if (service.provider.ownerUserId !== currentUser.id) {
    return NextResponse.json({ error: "Kamu tidak punya akses mentransfer produk/layanan ini." }, { status: 403 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: body.targetUserId },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User tujuan tidak ditemukan." }, { status: 404 });
  }

  if (!targetUser.botStartedAt || !targetUser.telegramChatId) {
    return NextResponse.json(
      { error: "User tujuan belum menghubungkan bot Tikep. Minta user untuk /start bot terlebih dahulu." },
      { status: 409 },
    );
  }

  if (targetUser.id === currentUser.id) {
    return NextResponse.json({ error: "Tidak bisa transfer ke diri sendiri." }, { status: 409 });
  }

  const [updatedProvider] = await Promise.all([
    prisma.provider.update({
      where: { id: service.providerId },
      data: {
        ownerUserId: targetUser.id,
        previousOwnerUserId: currentUser.id,
        ownerTransferredAt: new Date(),
      },
    }),
  ]);

  const activeInquiries = await prisma.serviceInquiry.findMany({
    where: {
      serviceId: service.id,
      status: { in: ["REQUESTED", "ACCEPTED"] },
      customerUser: {
        telegramChatId: { not: null },
      },
    },
    include: {
      customerUser: {
        select: { id: true, telegramChatId: true, username: true, firstName: true, lastName: true },
      },
    },
  });

  const oldOwnerLabel = userLabel(currentUser);
  const newOwnerLabel = userLabel(targetUser);
  const transferNote = `Produk/layanan "${service.title}" telah ditransfer dari ${oldOwnerLabel} ke ${newOwnerLabel}.`;

  const notificationResults = await Promise.all([
    targetUser.telegramChatId
      ? sendTelegramMessage({
          chatId: targetUser.telegramChatId,
          text: [
            `Hai ${newOwnerLabel}, kamu menerima transfer produk/layanan "${service.title}".`,
            `Kamu sekarang bisa mengelola dan menerima notifikasi order untuk produk/layanan ini.`,
          ].join("\n"),
        })
      : null,
    currentUser.telegramChatId
      ? sendTelegramMessage({
          chatId: currentUser.telegramChatId,
          text: [
            `Produk/layanan "${service.title}" berhasil ditransfer ke ${newOwnerLabel}.`,
            `Kamu sudah tidak menerima notifikasi order untuk produk/layanan ini.`,
          ].join("\n"),
        })
      : null,
    ...activeInquiries.map((inquiry) =>
      inquiry.customerUser.telegramChatId
        ? sendTelegramMessage({
            chatId: inquiry.customerUser.telegramChatId,
            text: [
              `Informasi: ${transferNote}`,
              `Untuk pertanyaan lanjutan, silakan hubungi owner yang baru.`,
            ].join("\n"),
          })
        : null,
    ),
  ]);

  const notifiedCustomers = notificationResults.filter(
    (result): result is NonNullable<typeof result> => result !== null && result.status === "sent",
  ).length;

  return NextResponse.json({
    ok: true,
    transferredTo: {
      id: targetUser.id,
      username: targetUser.username,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
    },
    notifiedCustomers,
  });
}
