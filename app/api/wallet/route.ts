import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import { getOrCreateWallet } from "@/lib/wallets";

export async function GET() {
  const user = await getDemoUser();
  const wallet = await prisma.$transaction(async (tx) => getOrCreateWallet(tx, user.id));
  const recentLedger = await prisma.walletLedger.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      amount: true,
      createdAt: true,
      giftPayment: {
        select: {
          orderId: true,
          mediaId: true,
        },
      },
    },
  });
  const withdraws = await prisma.withdrawRequest.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      method: true,
      accountName: true,
      accountNumber: true,
      adminFee: true,
      netAmount: true,
      status: true,
      createdAt: true,
    },
  });
  const receivedGifts = await prisma.giftPayment.findMany({
    where: {
      recipientUserId: user.id,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    take: 20,
    select: {
      id: true,
      orderId: true,
      mediaId: true,
      amount: true,
      completedAt: true,
      senderUser: {
        select: {
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return NextResponse.json({ wallet, recentLedger, withdraws, receivedGifts });
}
