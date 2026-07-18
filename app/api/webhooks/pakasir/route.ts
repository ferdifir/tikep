import { NextResponse } from "next/server";
import { getPakasirTransactionDetail, isMatchingPakasirWebhook } from "@/lib/pakasir";
import { prisma } from "@/lib/prisma";
import { notifyGiftRecipient, completeGiftPayment } from "@/lib/wallets";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    order_id?: string;
    project?: string;
    status?: string;
    payment_method?: string;
    completed_at?: string;
  };
  const orderId = body.order_id?.trim() ?? "";
  const amount = Number(body.amount);

  if (!orderId || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Webhook tidak valid." }, { status: 400 });
  }

  const gift = await prisma.giftPayment.findUnique({
    where: { orderId },
    include: {
      recipientUser: true,
    },
  });

  if (!gift) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }

  if (
    !isMatchingPakasirWebhook({
      project: body.project ?? "",
      orderId,
      amount,
      localOrderId: gift.orderId,
      localAmount: gift.amount,
    })
  ) {
    return NextResponse.json({ error: "Webhook tidak cocok." }, { status: 400 });
  }

  if (body.status !== "completed") {
    return NextResponse.json({ status: "ignored" });
  }

  const transaction = await getPakasirTransactionDetail({
    orderId: gift.orderId,
    amount: gift.amount,
  });

  if (transaction?.status !== "completed") {
    return NextResponse.json({ status: "pending" });
  }

  await prisma.$transaction(async (tx) => {
    await completeGiftPayment(tx, gift.id, transaction.completed_at ? new Date(transaction.completed_at) : new Date());
  });

  await notifyGiftRecipient({
    recipientTelegramId: gift.recipientUser.telegramId,
    amount: gift.amount,
    mediaId: gift.mediaId,
  });

  return NextResponse.json({ status: "completed" });
}
