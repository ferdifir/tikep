import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramPhoto } from "@/lib/telegram-bot";

export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
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
