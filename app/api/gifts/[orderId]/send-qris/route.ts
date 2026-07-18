import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { sendTelegramPhoto } from "@/lib/telegram-bot";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const body = (await request.json().catch(() => ({}))) as { initData?: string };
  const user = await getUserFromInitDataOrDemo(body.initData).catch((error) => {
    const response = authErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  });

  if (user instanceof NextResponse) {
    return user;
  }

  const gift = await prisma.giftPayment.findUnique({
    where: { orderId },
    include: {
      senderUser: true,
      media: true,
    },
  });

  if (!gift) {
    return NextResponse.json({ error: "Gift tidak ditemukan." }, { status: 404 });
  }

  if (gift.senderUserId !== user.id) {
    return NextResponse.json({ error: "Gift ini bukan milik user saat ini." }, { status: 403 });
  }

  if (!gift.senderUser.telegramId) {
    return NextResponse.json({ error: "Chat Telegram user belum tersedia." }, { status: 400 });
  }

  if (!gift.qrImageDataUrl) {
    return NextResponse.json({ error: "QRIS belum tersedia." }, { status: 400 });
  }

  const result = await sendTelegramPhoto({
    chatId: gift.senderUser.telegramId,
    photoDataUrl: gift.qrImageDataUrl,
    caption: `QRIS gift Tikep Rp${gift.amount.toLocaleString("id-ID")}. Order: ${gift.orderId}`,
  });

  if (result.status !== "sent") {
    return NextResponse.json({ error: "QRIS gagal dikirim via bot.", status: result.status }, { status: 502 });
  }

  return NextResponse.json({ status: "sent" });
}
