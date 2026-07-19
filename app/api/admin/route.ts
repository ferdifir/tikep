import { NextResponse } from "next/server";
import { getDeveloperUserFromRequest } from "@/lib/admin-auth";
import { normalizeUploadUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { markWithdrawPaid, rejectWithdraw } from "@/lib/withdraw-requests";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";

type AdminActionBody = {
  initData?: string;
  action?: string;
  id?: string;
  name?: string;
  isSystem?: boolean;
  createdByUserId?: string | null;
  caption?: string | null;
  isAnonymous?: boolean;
  title?: string;
  categoryId?: string;
  price?: number;
  description?: string;
  userId?: string;
  text?: string;
};

function userLabel(user: { username: string | null; firstName: string | null; lastName: string | null; telegramId: string | null }) {
  return user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || user.telegramId || "User";
}

function actionError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const developer = await getDeveloperUserFromRequest(request);

  if (developer instanceof NextResponse) {
    return developer;
  }

  const [categories, media, services, users, withdraws] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ deletedAt: "asc" }, { isSystem: "desc" }, { name: "asc" }],
      include: {
        createdByUser: {
          select: { id: true, username: true, firstName: true, lastName: true, telegramId: true },
        },
        _count: {
          select: { services: true },
        },
      },
    }),
    prisma.media.findMany({
      orderBy: [{ deletedAt: "asc" }, { createdAt: "desc" }],
      take: 120,
      include: {
        authorUser: {
          select: { id: true, username: true, firstName: true, lastName: true, telegramId: true },
        },
        service: {
          select: { id: true, title: true },
        },
        _count: {
          select: { giftPayments: true },
        },
      },
    }),
    prisma.service.findMany({
      orderBy: [{ deletedAt: "asc" }, { createdAt: "desc" }],
      take: 120,
      include: {
        provider: {
          include: {
            owner: {
              select: { id: true, username: true, firstName: true, lastName: true, telegramId: true },
            },
          },
        },
        category: true,
        _count: {
          select: { media: true, reviews: true, inquiries: true, reports: true },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ deletedAt: "asc" }, { createdAt: "desc" }],
      take: 120,
      include: {
        wallet: true,
        _count: {
          select: {
            media: true,
            providers: true,
            withdraws: true,
            giftsSent: true,
            giftsReceived: true,
          },
        },
      },
    }),
    prisma.withdrawRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 120,
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, telegramId: true, telegramChatId: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    currentUser: { id: developer.id, telegramId: developer.telegramId },
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      isSystem: category.isSystem,
      createdByUserId: category.createdByUserId,
      ownerLabel: category.createdByUser ? userLabel(category.createdByUser) : "Global",
      servicesCount: category._count.services,
      deletedAt: category.deletedAt?.toISOString() ?? null,
      createdAt: category.createdAt.toISOString(),
    })),
    media: media.map((item) => ({
      id: item.id,
      serviceId: item.serviceId,
      serviceTitle: item.service?.title ?? null,
      authorUserId: item.authorUserId,
      authorLabel: item.authorUser ? userLabel(item.authorUser) : item.isAnonymous ? "Anonymous" : "Unknown",
      isAnonymous: item.isAnonymous,
      caption: item.caption,
      type: item.type,
      url: normalizeUploadUrl(item.url) ?? item.url,
      thumbnailUrl: normalizeUploadUrl(item.thumbnailUrl),
      altText: item.altText,
      giftPaymentsCount: item._count.giftPayments,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    services: services.map((service) => ({
      id: service.id,
      title: service.title,
      provider: service.provider.name,
      ownerLabel: service.provider.owner ? userLabel(service.provider.owner) : "Tidak ada owner",
      categoryId: service.categoryId,
      categoryName: service.category.name,
      price: service.price,
      description: service.description,
      ratingSnapshot: service.ratingSnapshot,
      counts: service._count,
      deletedAt: service.deletedAt?.toISOString() ?? null,
      createdAt: service.createdAt.toISOString(),
    })),
    users: users.map((user) => ({
      id: user.id,
      label: userLabel(user),
      telegramId: user.telegramId,
      telegramChatId: user.telegramChatId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      botStartedAt: user.botStartedAt?.toISOString() ?? null,
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      wallet: user.wallet
        ? {
            balance: user.wallet.balance,
            pendingWithdraw: user.wallet.pendingWithdraw,
            totalEarned: user.wallet.totalEarned,
          }
        : null,
      counts: user._count,
      createdAt: user.createdAt.toISOString(),
    })),
    withdraws: withdraws.map((withdraw) => ({
      id: withdraw.id,
      userId: withdraw.userId,
      userLabel: userLabel(withdraw.user),
      amount: withdraw.amount,
      method: withdraw.method,
      accountName: withdraw.accountName,
      accountNumber: withdraw.accountNumber,
      adminFee: withdraw.adminFee,
      netAmount: withdraw.netAmount,
      payoutDetails: withdraw.payoutDetails,
      status: withdraw.status,
      developerNotifiedAt: withdraw.developerNotifiedAt?.toISOString() ?? null,
      paidAt: withdraw.paidAt?.toISOString() ?? null,
      rejectedAt: withdraw.rejectedAt?.toISOString() ?? null,
      createdAt: withdraw.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AdminActionBody;
  const developer = await getDeveloperUserFromRequest(request, body.initData);

  if (developer instanceof NextResponse) {
    return developer;
  }

  try {
    switch (body.action) {
      case "category.create": {
        const name = body.name?.trim() ?? "";
        if (name.length < 2) {
          return actionError("Nama kategori minimal 2 karakter.");
        }
        const category = await prisma.category.create({
          data: {
            name,
            slug: slugify(name),
            isSystem: Boolean(body.isSystem),
            createdByUserId: body.isSystem ? null : body.createdByUserId ?? developer.id,
          },
        });
        return NextResponse.json({ category });
      }
      case "category.update": {
        if (!body.id) return actionError("ID kategori wajib ada.");
        const name = body.name?.trim() ?? "";
        if (name.length < 2) {
          return actionError("Nama kategori minimal 2 karakter.");
        }
        const category = await prisma.category.update({
          where: { id: body.id },
          data: {
            name,
            slug: slugify(name),
            isSystem: Boolean(body.isSystem),
            createdByUserId: body.isSystem ? null : undefined,
          },
        });
        return NextResponse.json({ category });
      }
      case "category.softDelete":
        if (!body.id) return actionError("ID kategori wajib ada.");
        return NextResponse.json({ category: await prisma.category.update({ where: { id: body.id }, data: { deletedAt: new Date() } }) });
      case "category.restore":
        if (!body.id) return actionError("ID kategori wajib ada.");
        return NextResponse.json({ category: await prisma.category.update({ where: { id: body.id }, data: { deletedAt: null } }) });
      case "category.hardDelete":
        if (!body.id) return actionError("ID kategori wajib ada.");
        await prisma.category.delete({ where: { id: body.id } });
        return NextResponse.json({ ok: true });

      case "media.update":
        if (!body.id) return actionError("ID media wajib ada.");
        return NextResponse.json({
          media: await prisma.media.update({
            where: { id: body.id },
            data: {
              caption: body.caption?.trim() || null,
              isAnonymous: Boolean(body.isAnonymous),
            },
          }),
        });
      case "media.softDelete":
        if (!body.id) return actionError("ID media wajib ada.");
        return NextResponse.json({ media: await prisma.media.update({ where: { id: body.id }, data: { deletedAt: new Date() } }) });
      case "media.restore":
        if (!body.id) return actionError("ID media wajib ada.");
        return NextResponse.json({ media: await prisma.media.update({ where: { id: body.id }, data: { deletedAt: null } }) });
      case "media.hardDelete":
        if (!body.id) return actionError("ID media wajib ada.");
        await prisma.media.delete({ where: { id: body.id } });
        return NextResponse.json({ ok: true });

      case "service.update":
        if (!body.id) return actionError("ID produk/layanan wajib ada.");
        if (!body.title?.trim() || !body.categoryId || !Number.isFinite(Number(body.price)) || !body.description?.trim()) {
          return actionError("Data produk/layanan belum lengkap.");
        }
        return NextResponse.json({
          service: await prisma.service.update({
            where: { id: body.id },
            data: {
              title: body.title.trim(),
              categoryId: body.categoryId,
              price: Number(body.price),
              description: body.description.trim(),
            },
          }),
        });
      case "service.softDelete":
        if (!body.id) return actionError("ID produk/layanan wajib ada.");
        return NextResponse.json({ service: await prisma.service.update({ where: { id: body.id }, data: { deletedAt: new Date() } }) });
      case "service.restore":
        if (!body.id) return actionError("ID produk/layanan wajib ada.");
        return NextResponse.json({ service: await prisma.service.update({ where: { id: body.id }, data: { deletedAt: null } }) });
      case "service.hardDelete":
        if (!body.id) return actionError("ID produk/layanan wajib ada.");
        await prisma.service.delete({ where: { id: body.id } });
        return NextResponse.json({ ok: true });

      case "user.suspend":
        if (!body.id) return actionError("ID user wajib ada.");
        return NextResponse.json({ user: await prisma.user.update({ where: { id: body.id }, data: { suspendedAt: new Date() } }) });
      case "user.restore":
        if (!body.id) return actionError("ID user wajib ada.");
        return NextResponse.json({ user: await prisma.user.update({ where: { id: body.id }, data: { suspendedAt: null, deletedAt: null } }) });
      case "user.softDelete":
        if (!body.id) return actionError("ID user wajib ada.");
        return NextResponse.json({ user: await prisma.user.update({ where: { id: body.id }, data: { deletedAt: new Date() } }) });
      case "user.hardDelete":
        if (!body.id) return actionError("ID user wajib ada.");
        await prisma.user.delete({ where: { id: body.id } });
        return NextResponse.json({ ok: true });

      case "notification.send": {
        const userId = body.userId ?? body.id;
        const text = body.text?.trim() ?? "";
        if (!userId || text.length < 2) {
          return actionError("User dan pesan wajib diisi.");
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.telegramChatId) {
          return actionError("User belum pernah start bot, tidak ada chat id.", 409);
        }
        const result = await sendTelegramMessage({ chatId: user.telegramChatId, text });
        return NextResponse.json({ notificationStatus: result.status, error: result.error ?? null });
      }

      case "withdraw.paid": {
        if (!body.id) return actionError("ID withdraw wajib ada.");
        const result = await markWithdrawPaid(body.id);
        return NextResponse.json(result, { status: result.status === "missing" ? 404 : 200 });
      }
      case "withdraw.reject": {
        if (!body.id) return actionError("ID withdraw wajib ada.");
        const result = await rejectWithdraw(body.id);
        return NextResponse.json(result, { status: result.status === "missing" ? 404 : 200 });
      }
      default:
        return actionError("Action admin tidak dikenal.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Aksi admin gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
