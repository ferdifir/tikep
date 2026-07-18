import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { createReviewCode, getReviewUrls, hashReviewCode, sendReviewInviteMessage } from "@/lib/review-invites";

function getCustomerLabel(user: { username: string | null; firstName: string | null; lastName: string | null }) {
  return user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || "Customer";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const initData = new URL(request.url).searchParams.get("initData")?.trim() || undefined;
  const [{ id }, providerUser] = await Promise.all([
    params,
    getUserFromInitDataOrDemo(initData).catch((error) => {
      const response = authErrorResponse(error);
      if (response) {
        return response;
      }
      throw error;
    }),
  ]);

  if (providerUser instanceof NextResponse) {
    return providerUser;
  }

  const service = await prisma.service.findUnique({
    where: { id },
    include: { provider: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  if (service.provider.ownerUserId !== providerUser.id) {
    return NextResponse.json({ error: "Anda bukan pemilik layanan ini." }, { status: 403 });
  }

  const inquiries = await prisma.serviceInquiry.findMany({
    where: {
      serviceId: service.id,
      status: {
        in: ["ACCEPTED", "REVIEW_INVITED"],
      },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      customerUser: {
        select: {
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return NextResponse.json({
    inquiries: inquiries.map((inquiry) => ({
      id: inquiry.id,
      status: inquiry.status,
      customerLabel: getCustomerLabel(inquiry.customerUser),
      createdAt: inquiry.createdAt.toISOString(),
      updatedAt: inquiry.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = (await request.json().catch(() => ({}))) as { inquiryId?: string; initData?: string };
  const [{ id }, providerUser] = await Promise.all([
    params,
    getUserFromInitDataOrDemo(body.initData).catch((error) => {
      const response = authErrorResponse(error);
      if (response) {
        return response;
      }
      throw error;
    }),
  ]);

  if (providerUser instanceof NextResponse) {
    return providerUser;
  }

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      provider: true,
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  if (service.provider.ownerUserId !== providerUser.id) {
    return NextResponse.json({ error: "Anda bukan pemilik layanan ini." }, { status: 403 });
  }

  const inquiry = body.inquiryId
    ? await prisma.serviceInquiry.findFirst({
        where: {
          id: body.inquiryId,
          serviceId: service.id,
          providerId: service.providerId,
          status: {
            in: ["ACCEPTED", "REVIEW_INVITED"],
          },
        },
        include: {
          customerUser: true,
        },
      })
    : null;

  if (!inquiry) {
    return NextResponse.json({ error: "Pilih customer yang sudah diterima dari daftar pesan." }, { status: 400 });
  }

  if (!inquiry.customerUser.telegramChatId) {
    return NextResponse.json({ error: "Customer belum terhubung dengan bot." }, { status: 409 });
  }

  const code = createReviewCode();
  const { reviewUrl, telegramUrl } = getReviewUrls(request.url, code);
  const botMessage = await sendReviewInviteMessage({
    chatId: inquiry.customerUser.telegramChatId,
    serviceTitle: service.title,
    reviewUrl: telegramUrl ?? reviewUrl,
  });

  const invite = await prisma.reviewCode.create({
    data: {
      serviceId: service.id,
      providerId: service.providerId,
      createdByUserId: providerUser.id,
      codeHash: hashReviewCode(code),
      customerChatId: inquiry.customerUser.telegramChatId,
      inquiryId: inquiry.id,
      sentAt: botMessage.status === "sent" ? new Date() : null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.serviceInquiry.update({
    where: { id: inquiry.id },
    data: { status: "REVIEW_INVITED" },
  });

  return NextResponse.json(
    {
      invite: {
        id: invite.id,
        status: invite.status,
        expiresAt: invite.expiresAt.toISOString(),
        reviewUrl,
        telegramUrl,
        botMessageStatus: botMessage.status,
      },
    },
    { status: 201 },
  );
}
