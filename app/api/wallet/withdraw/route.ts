import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { getDeveloperTelegramUserId } from "@/lib/server-env";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { getOrCreateWallet } from "@/lib/wallets";
import { formatRupiah, getWithdrawMethod } from "@/lib/withdraw-methods";

const developerTelegramUserId = getDeveloperTelegramUserId();

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    method?: string;
    accountName?: string;
    accountNumber?: string;
    initData?: string;
  };
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

  const amount = Number(body.amount);
  const method = getWithdrawMethod(body.method ?? "");
  const accountName = body.accountName?.trim() ?? "";
  const accountNumber = body.accountNumber?.trim() ?? "";

  if (!method) {
    return NextResponse.json({ error: "Metode pencairan tidak valid." }, { status: 400 });
  }

  if (!Number.isInteger(amount) || amount < method.minimumAmount) {
    return NextResponse.json({ error: `Minimal pencairan ${formatRupiah(method.minimumAmount)}.` }, { status: 400 });
  }

  if (amount <= method.adminFee) {
    return NextResponse.json({ error: "Nominal harus lebih besar dari biaya admin." }, { status: 400 });
  }

  if (accountName.length < 3) {
    return NextResponse.json({ error: "Nama pemilik akun belum lengkap." }, { status: 400 });
  }

  if (accountNumber.length < 6) {
    return NextResponse.json({ error: "Nomor tujuan belum lengkap." }, { status: 400 });
  }

  const netAmount = amount - method.adminFee;
  const payoutDetails = `${method.label} - ${accountName} - ${accountNumber}`;

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
        method: method.id,
        accountName,
        accountNumber,
        adminFee: method.adminFee,
        netAmount,
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

  const notifyResult = developerTelegramUserId
    ? await sendTelegramMessage({
        chatId: developerTelegramUserId,
        text: [
          "Request withdraw Tikep",
          `ID: ${withdraw.id}`,
          `User: ${user.username ? `@${user.username}` : user.telegramId ?? user.id}`,
          `Metode: ${method.label}`,
          `Nama: ${withdraw.accountName}`,
          `Tujuan: ${withdraw.accountNumber}`,
          `Nominal: ${formatRupiah(withdraw.amount)}`,
          `Admin: ${formatRupiah(withdraw.adminFee)}`,
          `Diterima: ${formatRupiah(withdraw.netAmount)}`,
        ].join("\n"),
      })
    : { status: "not_configured" as const, error: "TELEGRAM_DEVELOPER_USER_ID belum dikonfigurasi." };

  if (notifyResult.status === "sent") {
    await prisma.withdrawRequest.update({
      where: { id: withdraw.id },
      data: { developerNotifiedAt: new Date() },
    });
  }

  return NextResponse.json({ withdraw, notificationStatus: notifyResult.status }, { status: 201 });
}
