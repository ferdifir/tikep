import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { answerTelegramCallbackQuery, editTelegramMessageText, sendTelegramMessage } from "@/lib/telegram-bot";
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
      username?: string;
      first_name?: string;
      last_name?: string;
      language_code?: string;
    };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: {
      id: number | string;
    };
    message?: {
      message_id?: number;
      chat: {
        id: number | string;
      };
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

function getUserLabel(user: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  telegramId: string | null;
}) {
  return user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || user.telegramId || "User Tikep";
}

function helpText() {
  return [
    "Command admin Tikep:",
    "/pending - lihat withdraw dan gift pending",
    "/pending_withdraws - lihat pencairan pending",
    "/pending_gifts - lihat gift pending",
    "/pending_inquiries - lihat inquiry yang belum dijawab provider",
    "/inquiry <id> - lihat detail inquiry",
    "/withdraw_paid <id> - tandai pencairan berhasil",
    "/withdraw_reject <id> - tolak pencairan dan kembalikan saldo",
  ].join("\n");
}

async function bindBotUser(update: TelegramUpdate) {
  const from = update.message?.from;
  const chatId = update.message?.chat.id;

  if (!from || !chatId) {
    return null;
  }

  return prisma.user.upsert({
    where: {
      telegramId: String(from.id),
    },
    update: {
      telegramChatId: String(chatId),
      botStartedAt: new Date(),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      languageCode: from.language_code,
    },
    create: {
      telegramId: String(from.id),
      telegramChatId: String(chatId),
      botStartedAt: new Date(),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      languageCode: from.language_code,
    },
  });
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

async function listPendingInquiries() {
  const inquiries = await prisma.serviceInquiry.findMany({
    where: { status: "REQUESTED" },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: {
      service: true,
      provider: {
        include: {
          owner: true,
        },
      },
      customerUser: true,
    },
  });

  if (!inquiries.length) {
    return "Tidak ada inquiry pending.";
  }

  return inquiries
    .map((inquiry) =>
      [
        `ID: ${inquiry.id}`,
        `Layanan: ${inquiry.service.title}`,
        `Provider: ${inquiry.provider.owner ? getUserLabel(inquiry.provider.owner) : inquiry.provider.name}`,
        `Customer: ${getUserLabel(inquiry.customerUser)}`,
        `Notif provider: ${inquiry.providerNotificationStatus ?? "-"}`,
        inquiry.providerNotificationError ? `Error: ${inquiry.providerNotificationError}` : null,
        inquiry.message ? `Pesan: ${inquiry.message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

async function getInquiryDetail(inquiryId: string) {
  const inquiry = await prisma.serviceInquiry.findUnique({
    where: { id: inquiryId },
    include: {
      service: true,
      provider: {
        include: {
          owner: true,
        },
      },
      customerUser: true,
      reviewCodes: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!inquiry) {
    return "Inquiry tidak ditemukan.";
  }

  return [
    `ID: ${inquiry.id}`,
    `Status: ${inquiry.status}`,
    `Layanan: ${inquiry.service.title}`,
    `Provider: ${inquiry.provider.owner ? getUserLabel(inquiry.provider.owner) : inquiry.provider.name}`,
    `Customer: ${getUserLabel(inquiry.customerUser)}`,
    `Notif provider: ${inquiry.providerNotificationStatus ?? "-"}`,
    inquiry.providerNotificationError ? `Error provider: ${inquiry.providerNotificationError}` : null,
    `Notif customer: ${inquiry.customerNotificationStatus ?? "-"}`,
    inquiry.customerNotificationError ? `Error customer: ${inquiry.customerNotificationError}` : null,
    `Review invite: ${inquiry.reviewInviteStatus ?? "-"}`,
    inquiry.reviewInviteError ? `Error review: ${inquiry.reviewInviteError}` : null,
    `Jumlah code review: ${inquiry.reviewCodes.length}`,
    inquiry.message ? `Pesan: ${inquiry.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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
    const [withdraws, gifts, inquiries] = await Promise.all([
      listPendingWithdraws(),
      listPendingGifts(),
      listPendingInquiries(),
    ]);
    return [`Pencairan pending:`, withdraws, `Gift pending:`, gifts, `Inquiry pending:`, inquiries].join("\n\n");
  }

  if (command === "/pending_withdraws") {
    return listPendingWithdraws();
  }

  if (command === "/pending_gifts") {
    return listPendingGifts();
  }

  if (command === "/pending_inquiries") {
    return listPendingInquiries();
  }

  if (command === "/inquiry") {
    if (!argument) {
      return "Format: /inquiry <id>";
    }

    return getInquiryDetail(argument);
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

async function handleInquiryCallback(update: TelegramUpdate) {
  const callback = update.callback_query;
  const data = callback?.data ?? "";

  if (!callback || (!data.startsWith("inquiry_accept:") && !data.startsWith("inquiry_reject:"))) {
    return false;
  }

  const action = data.startsWith("inquiry_accept:") ? "ACCEPTED" : "REJECTED";
  const inquiryId = data.split(":")[1];
  const inquiry = await prisma.serviceInquiry.findUnique({
    where: { id: inquiryId },
    include: {
      service: true,
      provider: {
        include: {
          owner: true,
        },
      },
      customerUser: true,
    },
  });

  if (!inquiry) {
    await answerTelegramCallbackQuery({
      callbackQueryId: callback.id,
      text: "Inquiry tidak ditemukan.",
      showAlert: true,
    });
    return true;
  }

  if (String(inquiry.provider.owner?.telegramId ?? "") !== String(callback.from.id)) {
    await answerTelegramCallbackQuery({
      callbackQueryId: callback.id,
      text: "Inquiry ini bukan milik kamu.",
      showAlert: true,
    });
    return true;
  }

  if (inquiry.status !== "REQUESTED") {
    await answerTelegramCallbackQuery({
      callbackQueryId: callback.id,
      text: `Inquiry sudah berstatus ${inquiry.status}.`,
      showAlert: true,
    });
    return true;
  }

  const respondedAt = new Date();
  const customerNotification = inquiry.customerUser.telegramChatId
    ? await sendTelegramMessage({
        chatId: inquiry.customerUser.telegramChatId,
        text:
          action === "ACCEPTED"
            ? inquiry.provider.owner?.username
              ? [
                  `Provider menerima permintaan kamu untuk ${inquiry.service.title}.`,
                  `Hubungi provider: @${inquiry.provider.owner.username}`,
                  `https://t.me/${inquiry.provider.owner.username}`,
                ].join("\n")
              : `Provider menerima permintaan kamu untuk ${inquiry.service.title}.`
            : `Provider belum bisa menerima permintaan kamu untuk ${inquiry.service.title}.`,
      })
    : { status: "failed" as const, error: "Customer belum punya chat_id Telegram.", messageId: null };

  const updatedInquiry = await prisma.serviceInquiry.update({
    where: { id: inquiry.id },
    data: {
      status: action,
      providerRespondedAt: respondedAt,
      customerNotifiedAt: customerNotification.status === "sent" ? respondedAt : null,
      customerNotificationStatus: customerNotification.status,
      customerNotificationError: customerNotification.error ?? null,
    },
  });

  await answerTelegramCallbackQuery({
    callbackQueryId: callback.id,
    text: action === "ACCEPTED" ? "Permintaan diterima." : "Permintaan ditolak.",
  });

  const providerSummary =
    updatedInquiry.status === "ACCEPTED"
      ? `Kamu menerima permintaan ${getUserLabel(inquiry.customerUser)} untuk ${inquiry.service.title}.`
      : `Kamu menolak permintaan ${getUserLabel(inquiry.customerUser)} untuk ${inquiry.service.title}.`;

  if (callback.message?.chat.id && callback.message.message_id) {
    const editResult = await editTelegramMessageText({
      chatId: String(callback.message.chat.id),
      messageId: callback.message.message_id,
      text: providerSummary,
    });

    if (editResult.status === "sent") {
      await prisma.serviceInquiry.update({
        where: { id: inquiry.id },
        data: { providerMessageEditedAt: new Date() },
      });
    } else {
      await sendTelegramMessage({
        chatId: String(callback.message.chat.id),
        text: `${providerSummary}\n\nCatatan: pesan tombol lama gagal diperbarui.`,
      });
    }
  } else if (callback.message?.chat.id) {
    await sendTelegramMessage({
      chatId: String(callback.message.chat.id),
      text: providerSummary,
    });
  }

  return true;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (webhookSecret && request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => ({}))) as TelegramUpdate;

  if (await handleInquiryCallback(update)) {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat.id;
  const text = update.message?.text;

  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  const [rawCommand] = normalizeCommand(text).split(" ");
  const command = rawCommand.split("@")[0];

  if (command === "/start") {
    await bindBotUser(update);

    if (!isAuthorizedDeveloper(update)) {
      await sendTelegramMessage({
        chatId: String(chatId),
        text: "Akun Telegram kamu sudah terhubung ke Tikep. Sekarang kamu bisa kembali ke Mini App.",
      });
      return NextResponse.json({ ok: true });
    }
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
