import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { createReviewCode, getReviewUrls, hashReviewCode, sendReviewInviteMessage } from "@/lib/review-invites";

const reviewInviteDelayMs = 24 * 60 * 60 * 1000;

function getCustomerLabel(user: { username: string | null; firstName: string | null; lastName: string | null }) {
  return user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || "Customer";
}

function getReviewInviteAvailableAt(inquiry: { providerRespondedAt: Date | null; updatedAt: Date }) {
  return new Date((inquiry.providerRespondedAt ?? inquiry.updatedAt).getTime() + reviewInviteDelayMs);
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
    return NextResponse.json({ error: "Produk/layanan tidak ditemukan." }, { status: 404 });
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
      reviewCodes: {
        where: {
          status: "ACTIVE",
          expiresAt: {
            gt: new Date(),
          },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    inquiries: inquiries.map((inquiry) => {
      const availableAt = getReviewInviteAvailableAt(inquiry);
      const hasActiveInvite = inquiry.reviewCodes.length > 0;
      return {
        id: inquiry.id,
        status: inquiry.status,
        customerLabel: getCustomerLabel(inquiry.customerUser),
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString(),
        availableAt: availableAt.toISOString(),
        canInvite: inquiry.status === "ACCEPTED" && !hasActiveInvite && availableAt.getTime() <= Date.now(),
        hasActiveInvite,
        inviteStatus: inquiry.reviewInviteStatus,
        inviteError: inquiry.reviewInviteError,
      };
    }),
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
    return NextResponse.json({ error: "Produk/layanan tidak ditemukan." }, { status: 404 });
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

  if (inquiry.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Invite review hanya bisa dikirim untuk inquiry yang sudah diterima." }, { status: 409 });
  }

  const availableAt = getReviewInviteAvailableAt(inquiry);

  if (availableAt.getTime() > Date.now()) {
    return NextResponse.json(
      {
        error: "Invite review belum bisa dikirim. Tunggu sampai customer punya waktu menggunakan produk/jasa.",
        availableAt: availableAt.toISOString(),
      },
      { status: 409 },
    );
  }

  const activeInvite = await prisma.reviewCode.findFirst({
    where: {
      inquiryId: inquiry.id,
      status: "ACTIVE",
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activeInvite) {
    return NextResponse.json(
      {
        error: "Invite review aktif untuk customer ini sudah ada.",
        invite: {
          id: activeInvite.id,
          status: activeInvite.status,
          expiresAt: activeInvite.expiresAt.toISOString(),
        },
      },
      { status: 409 },
    );
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
    data: {
      status: "REVIEW_INVITED",
      reviewInvitedAt: new Date(),
      reviewInviteStatus: botMessage.status,
      reviewInviteError: botMessage.error ?? null,
    },
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
