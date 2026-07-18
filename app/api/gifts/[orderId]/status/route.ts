import { NextResponse } from "next/server";
import { getPakasirTransactionDetail } from "@/lib/pakasir";
import { prisma } from "@/lib/prisma";
import { notifyGiftRecipient, completeGiftPayment } from "@/lib/wallets";

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const gift = await prisma.giftPayment.findUnique({
    where: { orderId },
    include: {
      recipientUser: true,
    },
  });

  if (!gift) {
    return NextResponse.json({ error: "Gift tidak ditemukan." }, { status: 404 });
  }

  if (gift.status === "PENDING") {
    const transaction = await getPakasirTransactionDetail({
      orderId: gift.orderId,
      amount: gift.amount,
    });

    if (transaction?.status === "completed") {
      await prisma.$transaction(async (tx) => {
        await completeGiftPayment(tx, gift.id, transaction.completed_at ? new Date(transaction.completed_at) : new Date());
      });

      await notifyGiftRecipient({
        recipientTelegramId: gift.recipientUser.telegramId,
        amount: gift.amount,
        mediaId: gift.mediaId,
      });
    }
  }

  const refreshedGift = await prisma.giftPayment.findUnique({
    where: { orderId },
    select: {
      orderId: true,
      amount: true,
      totalPayment: true,
      status: true,
      expiredAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ gift: refreshedGift });
}
