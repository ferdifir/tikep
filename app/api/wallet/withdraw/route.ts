import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { getOrCreateWallet } from "@/lib/wallets";

const developerChatId = process.env.TELEGRAM_DEVELOPER_CHAT_ID ?? "7764382006";

export async function POST(request: Request) {
  const user = await getDemoUser();
  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    payoutDetails?: string;
  };
  const amount = Number(body.amount);
  const payoutDetails = body.payoutDetails?.trim() ?? "";

  if (!Number.isInteger(amount) || amount < 10000) {
    return NextResponse.json({ error: "Minimal withdraw Rp10.000." }, { status: 400 });
  }

  if (payoutDetails.length < 8) {
    return NextResponse.json({ error: "Detail payout belum lengkap." }, { status: 400 });
  }

  const withdraw = await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, user.id);

    if (wallet.balance < amount) {
      throw new Error("Saldo tidak cukup.");
    }

    const request = await tx.withdrawRequest.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        amount,
        payoutDetails,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: amount },
        pendingWithdraw: { increment: amount },
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAW_HOLD",
        amount: -amount,
        withdrawRequestId: request.id,
      },
    });

    return request;
  }).catch((error) => {
    if (error instanceof Error && error.message === "Saldo tidak cukup.") {
      return null;
    }
    throw error;
  });

  if (!withdraw) {
    return NextResponse.json({ error: "Saldo tidak cukup." }, { status: 400 });
  }

  const notifyResult = await sendTelegramMessage({
    chatId: developerChatId,
    text: [
      "Request withdraw Tikep",
      `ID: ${withdraw.id}`,
      `User: ${user.username ? `@${user.username}` : user.telegramId ?? user.id}`,
      `Nominal: Rp${withdraw.amount.toLocaleString("id-ID")}`,
      `Payout: ${withdraw.payoutDetails}`,
    ].join("\n"),
  });

  if (notifyResult.status === "sent") {
    await prisma.withdrawRequest.update({
      where: { id: withdraw.id },
      data: { developerNotifiedAt: new Date() },
    });
  }

  return NextResponse.json({ withdraw, notificationStatus: notifyResult.status }, { status: 201 });
}
