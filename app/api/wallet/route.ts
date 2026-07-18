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
    take: 5,
    select: {
      id: true,
      type: true,
      amount: true,
      createdAt: true,
    },
  });
  const withdraws = await prisma.withdrawRequest.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ wallet, recentLedger, withdraws });
}
