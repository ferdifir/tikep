import { NextResponse } from "next/server";
import { calculateServiceRatingSnapshot, scoreReviewWithAI } from "@/lib/ai-review-score";
import { authErrorResponse } from "@/lib/api-errors";
import { getUserFromInitDataOrDemo } from "@/lib/request-user";
import { mapService, serviceInclude } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";
import { hashReviewCode } from "@/lib/review-invites";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ error: "Kode review wajib dikirim." }, { status: 400 });
  }

  const invite = await prisma.reviewCode.findUnique({
    where: {
      codeHash: hashReviewCode(code),
    },
    include: {
      service: {
        include: serviceInclude,
      },
      provider: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Kode review tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      usedAt: invite.usedAt?.toISOString() ?? null,
      service: mapService(invite.service),
      provider: {
        name: invite.provider.name,
        slug: invite.provider.slug,
        avatar: invite.provider.avatar,
        avatarTone: invite.provider.avatarTone,
      },
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    initData?: string;
    sentiment?: "positive" | "negative";
    text?: string;
  };
  const code = body.code?.trim();
  const text = body.text?.trim() ?? "";

  if (!code || !body.sentiment || text.length < 8) {
    return NextResponse.json({ error: "Review belum lengkap." }, { status: 400 });
  }

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

  const invite = await prisma.reviewCode.findUnique({
    where: {
      codeHash: hashReviewCode(code),
    },
    include: {
      service: {
        include: serviceInclude,
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Kode review tidak ditemukan." }, { status: 404 });
  }

  if (invite.status !== "ACTIVE" || invite.usedAt || invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Kode review sudah tidak aktif." }, { status: 409 });
  }

  let reviewScore: number;

  try {
    reviewScore = await scoreReviewWithAI({
      sentiment: body.sentiment,
      text,
      serviceTitle: invite.service.title,
    });
  } catch {
    return NextResponse.json({ error: "AI gagal menentukan score review. Coba kirim lagi." }, { status: 502 });
  }

  const review = await prisma.$transaction(async (tx) => {
    const createdReview = await tx.review.create({
      data: {
        id: `review-${Date.now()}-${invite.id}`,
        serviceId: invite.serviceId,
        authorUserId: user.id,
        reviewCodeId: invite.id,
        sentiment: body.sentiment === "positive" ? "POSITIVE" : "NEGATIVE",
        reviewScore,
        status: "VERIFIED",
        verificationMethod: "PROVIDER_CODE",
        author: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Customer",
        text,
      },
    });

    await tx.reviewCode.update({
      where: { id: invite.id },
      data: {
        status: "USED",
        usedByUserId: user.id,
        usedAt: new Date(),
      },
    });

    const scoredReviews = await tx.review.findMany({
      where: {
        serviceId: invite.serviceId,
        status: "VERIFIED",
        reviewScore: {
          not: null,
        },
      },
      select: {
        reviewScore: true,
      },
    });
    const ratingSnapshot = calculateServiceRatingSnapshot(scoredReviews.map((item) => item.reviewScore ?? 0));

    await tx.service.update({
      where: { id: invite.serviceId },
      data: { ratingSnapshot },
    });

    return createdReview;
  });

  const service = await prisma.service.findUnique({
    where: { id: invite.serviceId },
    include: serviceInclude,
  });

  return NextResponse.json({
    review: {
      id: review.id,
      status: review.status,
      verificationMethod: review.verificationMethod,
      reviewScore: review.reviewScore,
    },
    service: service ? mapService(service) : null,
  });
}
