import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { formatRupiah } from "@/lib/withdraw-methods";

export async function markWithdrawPaid(withdrawId: string) {
  const withdraw = await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawRequest.findUnique({
      where: { id: withdrawId },
      include: {
        wallet: true,
        user: true,
      },
    });

    if (!request) {
      return { status: "missing" as const };
    }

    if (request.status !== "PENDING") {
      return { status: "not_pending" as const, request };
    }

    const updated = await tx.withdrawRequest.update({
      where: { id: request.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    await tx.wallet.update({
      where: { id: request.walletId },
      data: {
        pendingWithdraw: { decrement: request.amount },
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: request.walletId,
        type: "WITHDRAW_PAID",
        amount: 0,
        withdrawRequestId: request.id,
      },
    });

    return { status: "paid" as const, request: updated };
  });

  if (withdraw.status === "paid" && withdraw.request.user.telegramId) {
    await sendTelegramMessage({
      chatId: withdraw.request.user.telegramId,
      text: `Pencairan ${formatRupiah(withdraw.request.netAmount)} berhasil diproses.`,
    });
  }

  return withdraw;
}

export async function rejectWithdraw(withdrawId: string) {
  const withdraw = await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawRequest.findUnique({
      where: { id: withdrawId },
      include: {
        wallet: true,
        user: true,
      },
    });

    if (!request) {
      return { status: "missing" as const };
    }

    if (request.status !== "PENDING") {
      return { status: "not_pending" as const, request };
    }

    const updated = await tx.withdrawRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    await tx.wallet.update({
      where: { id: request.walletId },
      data: {
        balance: { increment: request.amount },
        pendingWithdraw: { decrement: request.amount },
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: request.walletId,
        type: "WITHDRAW_RELEASE",
        amount: request.amount,
        withdrawRequestId: request.id,
      },
    });

    return { status: "rejected" as const, request: updated };
  });

  if (withdraw.status === "rejected" && withdraw.request.user.telegramId) {
    await sendTelegramMessage({
      chatId: withdraw.request.user.telegramId,
      text: `Pencairan ${formatRupiah(withdraw.request.amount)} ditolak dan saldo dikembalikan ke wallet Tikep.`,
    });
  }

  return withdraw;
}
