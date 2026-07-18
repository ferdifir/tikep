import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { sendTelegramMessage } from "@/lib/telegram-bot";

type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function getOrCreateWallet(tx: PrismaTx, userId: string) {
  return tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function completeGiftPayment(tx: PrismaTx, giftPaymentId: string, completedAt?: Date) {
  const gift = await tx.giftPayment.findUnique({
    where: { id: giftPaymentId },
    include: {
      recipientUser: true,
      media: true,
    },
  });

  if (!gift || gift.status === "COMPLETED") {
    return gift;
  }

  if (gift.status !== "PENDING") {
    return gift;
  }

  const wallet = await getOrCreateWallet(tx, gift.recipientUserId);
  const completedGift = await tx.giftPayment.update({
    where: { id: gift.id },
    data: {
      status: "COMPLETED",
      completedAt: completedAt ?? new Date(),
    },
  });

  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: gift.amount },
      totalEarned: { increment: gift.amount },
    },
  });

  await tx.walletLedger.create({
    data: {
      walletId: wallet.id,
      type: "GIFT_CREDIT",
      amount: gift.amount,
      giftPaymentId: gift.id,
    },
  });

  return completedGift;
}

export async function notifyGiftRecipient(input: {
  recipientTelegramId: string | null;
  amount: number;
  mediaId: string;
}) {
  if (!input.recipientTelegramId) {
    return { status: "missing_chat" as const };
  }

  return sendTelegramMessage({
    chatId: input.recipientTelegramId,
    text: `Kamu menerima gift Rp${input.amount.toLocaleString("id-ID")} untuk media Tikep kamu.`,
  });
}
