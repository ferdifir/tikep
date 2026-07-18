import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { createReviewCode, getReviewUrls, hashReviewCode, sendReviewInviteMessage } from "@/lib/review-invites";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, providerUser] = await Promise.all([params, getDemoUser()]);
  const body = (await request.json().catch(() => ({}))) as { customerChatId?: string };
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      provider: true,
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  }

  if (service.provider.ownerUserId && service.provider.ownerUserId !== providerUser.id) {
    return NextResponse.json({ error: "Anda bukan pemilik layanan ini." }, { status: 403 });
  }

  const code = createReviewCode();
  const { reviewUrl, telegramUrl } = getReviewUrls(request.url, code);
  const customerChatId = body.customerChatId?.trim() || null;
  const botMessage = customerChatId
    ? await sendReviewInviteMessage({
        chatId: customerChatId,
        serviceTitle: service.title,
        reviewUrl,
      })
    : { status: "not_requested" as const };

  const invite = await prisma.reviewCode.create({
    data: {
      serviceId: service.id,
      providerId: service.providerId,
      createdByUserId: providerUser.id,
      codeHash: hashReviewCode(code),
      customerChatId,
      sentAt: botMessage.status === "sent" ? new Date() : null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
