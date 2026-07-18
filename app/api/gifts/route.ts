import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { createPakasirQrisTransaction } from "@/lib/pakasir";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";

const allowedAmounts = [5000, 10000, 25000, 50000];
const minCustomAmount = 5000;
const maxCustomAmount = 1000000;

function isValidGiftAmount(amount: number) {
  return (
    Number.isInteger(amount) &&
    amount >= minCustomAmount &&
    amount <= maxCustomAmount &&
    (allowedAmounts.includes(amount) || amount % 1000 === 0)
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    mediaId?: string;
    amount?: number;
    initData?: string;
  };
  const mediaId = body.mediaId?.trim() ?? "";
  const amount = Number(body.amount);

  if (!mediaId || !isValidGiftAmount(amount)) {
    return NextResponse.json({ error: "Nominal gift tidak valid." }, { status: 400 });
  }

  const [sender, media] = await Promise.all([
    getUserFromInitDataOrDemo(body.initData).catch((error) => {
      const response = authErrorResponse(error);
      if (response) {
        return response;
      }
      throw error;
    }),
    prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        authorUser: true,
      },
    }),
  ]);

  if (sender instanceof NextResponse) {
    return sender;
  }

  if (!media) {
    return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
  }

  if (media.isAnonymous || !media.authorUserId) {
    return NextResponse.json({ error: "Media anonymous tidak menerima gift." }, { status: 403 });
  }

  const orderId = `TIK-GIFT-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const payment = await createPakasirQrisTransaction({ orderId, amount });
  const qrImageDataUrl = await QRCode.toDataURL(payment.payment_number, {
    margin: 1,
    width: 720,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });

  const gift = await prisma.giftPayment.create({
    data: {
      orderId,
      mediaId: media.id,
      senderUserId: sender.id,
      recipientUserId: media.authorUserId,
      amount,
      fee: payment.fee ?? null,
      totalPayment: payment.total_payment ?? amount,
      paymentMethod: payment.payment_method,
      paymentNumber: payment.payment_number,
      qrImageDataUrl,
      expiredAt: new Date(payment.expired_at),
    },
    select: {
      id: true,
      orderId: true,
      amount: true,
      totalPayment: true,
      paymentMethod: true,
      paymentNumber: true,
      qrImageDataUrl: true,
      status: true,
      expiredAt: true,
    },
  });

  return NextResponse.json({ gift }, { status: 201 });
}
