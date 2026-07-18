import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { formatRupiah } from "@/lib/withdraw-methods";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat: {
      id: number | string;
    };
    from?: {
      id: number | string;
    };
  };
};

const developerChatId = process.env.TELEGRAM_DEVELOPER_CHAT_ID ?? "7764382006";

function normalizeCommand(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function isAuthorizedDeveloper(update: TelegramUpdate) {
  return String(update.message?.from?.id ?? "") === String(developerChatId);
}

function helpText() {
  return [
    "Command admin Tikep:",
    "/pending - lihat withdraw dan gift pending",
    "/pending_withdraws - lihat pencairan pending",
    "/pending_gifts - lihat gift pending",
    "/withdraw_paid <id> - tandai pencairan berhasil",
    "/withdraw_reject <id> - tolak pencairan dan kembalikan saldo",
  ].join("\n");
}

async function listPendingWithdraws() {
  const withdraws = await prisma.withdrawRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: {
      user: true,
    },
  });

  if (!withdraws.length) {
    return "Tidak ada pencairan pending.";
  }

  return withdraws
    .map((withdraw) =>
      [
        `ID: ${withdraw.id}`,
        `User: ${withdraw.user.username ? `@${withdraw.user.username}` : withdraw.user.telegramId ?? withdraw.user.id}`,
        `Metode: ${withdraw.method}`,
        `Nominal: ${formatRupiah(withdraw.amount)}`,
        `Admin: ${formatRupiah(withdraw.adminFee)}`,
        `Diterima: ${formatRupiah(withdraw.netAmount)}`,
        `Tujuan: ${withdraw.accountName} - ${withdraw.accountNumber}`,
      ].join("\n"),
    )
    .join("\n\n");
}

async function listPendingGifts() {
  const gifts = await prisma.giftPayment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: {
      senderUser: true,
      recipientUser: true,
    },
  });

  if (!gifts.length) {
    return "Tidak ada gift pending.";
  }

  return gifts
    .map((gift) =>
      [
        `Order: ${gift.orderId}`,
        `Dari: ${gift.senderUser.username ? `@${gift.senderUser.username}` : gift.senderUser.telegramId ?? gift.senderUser.id}`,
        `Untuk: ${gift.recipientUser.username ? `@${gift.recipientUser.username}` : gift.recipientUser.telegramId ?? gift.recipientUser.id}`,
        `Nominal: ${formatRupiah(gift.amount)}`,
        `Total bayar: ${formatRupiah(gift.totalPayment ?? gift.amount)}`,
        `Expired: ${gift.expiredAt.toISOString()}`,
      ].join("\n"),
    )
    .join("\n\n");
}

async function markWithdrawPaid(withdrawId: string) {
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

async function rejectWithdraw(withdrawId: string) {
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

async function handleAdminCommand(text: string) {
  const [rawCommand, argument] = normalizeCommand(text).split(" ");
  const command = rawCommand.split("@")[0];

  if (command === "/start" || command === "/help") {
    return helpText();
  }

  if (command === "/pending") {
    const [withdraws, gifts] = await Promise.all([listPendingWithdraws(), listPendingGifts()]);
    return [`Pencairan pending:`, withdraws, `Gift pending:`, gifts].join("\n\n");
  }

  if (command === "/pending_withdraws") {
    return listPendingWithdraws();
  }

  if (command === "/pending_gifts") {
    return listPendingGifts();
  }

  if (command === "/withdraw_paid") {
    if (!argument) {
      return "Format: /withdraw_paid <id>";
    }

    const result = await markWithdrawPaid(argument);

    if (result.status === "missing") {
      return "Pencairan tidak ditemukan.";
    }

    if (result.status === "not_pending") {
      return `Pencairan sudah berstatus ${result.request.status}.`;
    }

    return `Pencairan ${result.request.id} ditandai berhasil.`;
  }

  if (command === "/withdraw_reject") {
    if (!argument) {
      return "Format: /withdraw_reject <id>";
    }

    const result = await rejectWithdraw(argument);

    if (result.status === "missing") {
      return "Pencairan tidak ditemukan.";
    }

    if (result.status === "not_pending") {
      return `Pencairan sudah berstatus ${result.request.status}.`;
    }

    return `Pencairan ${result.request.id} ditolak dan saldo dikembalikan.`;
  }

  return helpText();
}

export async function POST(request: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (webhookSecret && request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => ({}))) as TelegramUpdate;
  const chatId = update.message?.chat.id;
  const text = update.message?.text;

  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  if (!isAuthorizedDeveloper(update)) {
    await sendTelegramMessage({
      chatId: String(chatId),
      text: "Command ini hanya tersedia untuk admin Tikep.",
    });
    return NextResponse.json({ ok: true });
  }

  const reply = await handleAdminCommand(text);
  await sendTelegramMessage({
    chatId: String(chatId),
    text: reply,
  });

  return NextResponse.json({ ok: true });
}
