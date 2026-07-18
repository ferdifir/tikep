import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequestUrl, getUserFromInitDataOrDemo } from "@/lib/request-user";

function getUserLabel(user: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  telegramId: string | null;
}) {
  return user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || user.telegramId || "User";
}

function mapInquiry(inquiry: {
  id: string;
  status: string;
  message: string | null;
  providerNotificationStatus: string | null;
  providerNotificationError: string | null;
  customerNotificationStatus: string | null;
  customerNotificationError: string | null;
  providerRespondedAt: Date | null;
  customerNotifiedAt: Date | null;
  reviewInvitedAt: Date | null;
  reviewInviteStatus: string | null;
  reviewInviteError: string | null;
  createdAt: Date;
  updatedAt: Date;
  service: {
    id: string;
    title: string;
  };
  provider: {
    name: string;
    owner: {
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      telegramId: string | null;
    } | null;
  };
  customerUser: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    telegramId: string | null;
  };
}) {
  return {
    id: inquiry.id,
    status: inquiry.status,
    message: inquiry.message,
    service: inquiry.service,
    providerName: inquiry.provider.name,
    providerLabel: inquiry.provider.owner ? getUserLabel(inquiry.provider.owner) : inquiry.provider.name,
    customerLabel: getUserLabel(inquiry.customerUser),
    providerNotificationStatus: inquiry.providerNotificationStatus,
    providerNotificationError: inquiry.providerNotificationError,
    customerNotificationStatus: inquiry.customerNotificationStatus,
    customerNotificationError: inquiry.customerNotificationError,
    providerRespondedAt: inquiry.providerRespondedAt?.toISOString() ?? null,
    customerNotifiedAt: inquiry.customerNotifiedAt?.toISOString() ?? null,
    reviewInvitedAt: inquiry.reviewInvitedAt?.toISOString() ?? null,
    reviewInviteStatus: inquiry.reviewInviteStatus,
    reviewInviteError: inquiry.reviewInviteError,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const user = await getUserFromInitDataOrDemo(getInitDataFromRequestUrl(request)).catch((error) => {
    const response = authErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  });

  if (user instanceof NextResponse) {
    return user;
  }

  const include = {
    service: {
      select: {
        id: true,
        title: true,
      },
    },
    provider: {
      select: {
        name: true,
        owner: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
      },
    },
    customerUser: {
      select: {
        username: true,
        firstName: true,
        lastName: true,
        telegramId: true,
      },
    },
  };

  const [providerInquiries, customerInquiries] = await Promise.all([
    prisma.serviceInquiry.findMany({
      where: {
        provider: {
          ownerUserId: user.id,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include,
    }),
    prisma.serviceInquiry.findMany({
      where: {
        customerUserId: user.id,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include,
    }),
  ]);

  return NextResponse.json({
    providerInquiries: providerInquiries.map(mapInquiry),
    customerInquiries: customerInquiries.map(mapInquiry),
  });
}
