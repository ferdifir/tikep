"use client";

import {
  Banknote,
  Bell,
  Boxes,
  Check,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RotateCcw,
  Shield,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { getTelegramInitData } from "@/lib/telegram-webapp";

type AdminTab = "categories" | "media" | "services" | "users" | "notifications" | "withdraws";

type AdminData = {
  categories: AdminCategory[];
  media: AdminMedia[];
  services: AdminService[];
  users: AdminUser[];
  withdraws: AdminWithdraw[];
};

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  createdByUserId: string | null;
  ownerLabel: string;
  servicesCount: number;
  deletedAt: string | null;
};

type AdminMedia = {
  id: string;
  serviceId: string | null;
  serviceTitle: string | null;
  authorUserId: string | null;
  authorLabel: string;
  isAnonymous: boolean;
  caption: string | null;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  giftPaymentsCount: number;
  deletedAt: string | null;
  createdAt: string;
};

type AdminService = {
  id: string;
  title: string;
  provider: string;
  ownerLabel: string;
  categoryId: string;
  categoryName: string;
  price: number;
  description: string;
  ratingSnapshot: number;
  counts: { media: number; reviews: number; inquiries: number; reports: number };
  deletedAt: string | null;
};

type AdminUser = {
  id: string;
  label: string;
  telegramId: string | null;
  telegramChatId: string | null;
  username: string | null;
  botStartedAt: string | null;
  suspendedAt: string | null;
  deletedAt: string | null;
  wallet: { balance: number; pendingWithdraw: number; totalEarned: number } | null;
  counts: { media: number; providers: number; withdraws: number; giftsSent: number; giftsReceived: number };
};

type AdminWithdraw = {
  id: string;
  userId: string;
  userLabel: string;
  amount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  adminFee: number;
  netAmount: number;
  status: string;
  createdAt: string;
};

const tabs: { value: AdminTab; label: string; icon: typeof Tag }[] = [
  { value: "categories", label: "Kategori", icon: Tag },
  { value: "media", label: "Explore", icon: ImageIcon },
  { value: "services", label: "Produk", icon: Boxes },
  { value: "users", label: "Akun", icon: UserRound },
  { value: "notifications", label: "Notif", icon: MessageCircle },
  { value: "withdraws", label: "Withdraw", icon: Banknote },
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function statusClass(deletedAt?: string | null, suspendedAt?: string | null) {
  if (deletedAt) return "border-rose-200 bg-rose-50 text-rose-700";
  if (suspendedAt) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function StatusPill({ deletedAt, suspendedAt }: { deletedAt?: string | null; suspendedAt?: string | null }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${statusClass(deletedAt, suspendedAt)}`}>
      {deletedAt ? "Deleted" : suspendedAt ? "Suspended" : "Active"}
    </span>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("categories");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");

  async function loadAdmin() {
    setIsLoading(true);
    const initData = getTelegramInitData();
    const response = await fetch(initData ? `/api/admin?initData=${encodeURIComponent(initData)}` : "/api/admin");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error ?? "Admin gagal dimuat.");
    }
    setData(payload as AdminData);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadAdmin()
        .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Admin gagal dimuat."))
        .finally(() => setIsLoading(false));
    });
  }, []);

  async function runAction(action: string, payload: Record<string, unknown> = {}) {
    setBusyAction(`${action}:${String(payload.id ?? payload.userId ?? "")}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, initData: getTelegramInitData(), ...payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error ?? "Aksi admin gagal.");
      }
      await loadAdmin();
      setNotice("Perubahan tersimpan.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Aksi admin gagal.");
    } finally {
      setBusyAction("");
      setIsLoading(false);
    }
  }

  const activeData = useMemo(() => {
    if (!data) return 0;
    if (activeTab === "categories") return data.categories.length;
    if (activeTab === "media") return data.media.length;
    if (activeTab === "services") return data.services.length;
    if (activeTab === "users") return data.users.length;
    if (activeTab === "withdraws") return data.withdraws.length;
    return data.users.filter((user) => user.telegramChatId).length;
  }, [activeTab, data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-base font-bold text-gray-950">Admin Tikep</h1>
            <p className="text-xs font-medium text-gray-500">{activeData} item</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                title={tab.label}
                aria-label={tab.label}
                className={`flex h-10 items-center justify-center rounded-md transition ${
                  active ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:bg-white/70"
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </header>

      <main className="space-y-3 p-4">
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
        {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div> : null}

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !data ? (
          <EmptyState title="Admin tidak tersedia" body="Session developer tidak valid." />
        ) : activeTab === "categories" ? (
          <CategoriesPanel data={data} busyAction={busyAction} runAction={runAction} />
        ) : activeTab === "media" ? (
          <MediaPanel items={data.media} busyAction={busyAction} runAction={runAction} />
        ) : activeTab === "services" ? (
          <ServicesPanel data={data} busyAction={busyAction} runAction={runAction} />
        ) : activeTab === "users" ? (
          <UsersPanel users={data.users} busyAction={busyAction} runAction={runAction} />
        ) : activeTab === "notifications" ? (
          <NotificationsPanel users={data.users} busyAction={busyAction} runAction={runAction} />
        ) : (
          <WithdrawPanel withdraws={data.withdraws} busyAction={busyAction} runAction={runAction} />
        )}
      </main>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 text-rose-700 hover:bg-rose-50"
      : tone === "success"
        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        : "border-gray-200 text-gray-700 hover:bg-gray-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition disabled:opacity-40 ${toneClass}`}
    >
      {icon}
    </button>
  );
}

function CategoriesPanel({
  data,
  busyAction,
  runAction,
}: {
  data: AdminData;
  busyAction: string;
  runAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [isSystem, setIsSystem] = useState(true);
  const [ownerId, setOwnerId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction("category.create", { name, isSystem, createdByUserId: ownerId || null });
    setName("");
  }

  return (
    <section className="space-y-3">
      <form onSubmit={submit} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama kategori" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-500" />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select value={isSystem ? "system" : "user"} onChange={(event) => setIsSystem(event.target.value === "system")} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="system">Global/system</option>
            <option value="user">Milik user</option>
          </select>
          <button type="submit" className="rounded-lg bg-gray-900 px-4 text-sm font-bold text-white">Tambah</button>
        </div>
        {!isSystem ? (
          <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Developer</option>
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>{user.label}</option>
            ))}
          </select>
        ) : null}
      </form>
      {data.categories.map((category) => (
        <CategoryRow key={category.id} category={category} busyAction={busyAction} runAction={runAction} />
      ))}
    </section>
  );
}

function CategoryRow({
  category,
  busyAction,
  runAction,
}: {
  category: AdminCategory;
  busyAction: string;
  runAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(category.name);
  const [isSystem, setIsSystem] = useState(category.isSystem);

  return (
    <article className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill deletedAt={category.deletedAt} />
            <span className="text-xs font-bold text-gray-500">{category.isSystem ? "Global" : category.ownerLabel}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-gray-950">{category.name}</p>
          <p className="text-xs text-gray-500">{category.slug} · {category.servicesCount} produk</p>
        </div>
        <div className="flex gap-1">
          <ActionButton icon={<Check className="h-4 w-4" />} label="Simpan" disabled={Boolean(busyAction)} tone="success" onClick={() => runAction("category.update", { id: category.id, name, isSystem })} />
          {category.deletedAt ? (
            <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Restore" disabled={Boolean(busyAction)} onClick={() => runAction("category.restore", { id: category.id })} />
          ) : (
            <ActionButton icon={<X className="h-4 w-4" />} label="Soft delete" disabled={Boolean(busyAction)} onClick={() => runAction("category.softDelete", { id: category.id })} />
          )}
          <ActionButton icon={<Trash2 className="h-4 w-4" />} label="Hard delete" disabled={Boolean(busyAction)} tone="danger" onClick={() => runAction("category.hardDelete", { id: category.id })} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <select value={isSystem ? "system" : "user"} onChange={(event) => setIsSystem(event.target.value === "system")} className="rounded-lg border border-gray-200 px-2 text-sm">
          <option value="system">Global</option>
          <option value="user">User</option>
        </select>
      </div>
    </article>
  );
}

function MediaPanel({
  items,
  busyAction,
  runAction,
}: {
  items: AdminMedia[];
  busyAction: string;
  runAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      {items.map((item) => (
        <MediaRow key={item.id} item={item} busyAction={busyAction} runAction={runAction} />
      ))}
    </section>
  );
}

function MediaRow({ item, busyAction, runAction }: { item: AdminMedia; busyAction: string; runAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  const [caption, setCaption] = useState(item.caption ?? "");
  const [isAnonymous, setIsAnonymous] = useState(item.isAnonymous);
  return (
    <article className="grid grid-cols-[88px_1fr] gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="overflow-hidden rounded-lg bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumbnailUrl ?? item.url} alt="" className="aspect-[4/5] h-full w-full object-cover" />
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <StatusPill deletedAt={item.deletedAt} />
            <p className="mt-1 truncate text-sm font-bold text-gray-950">{item.serviceTitle ?? "Explore standalone"}</p>
            <p className="truncate text-xs text-gray-500">{item.type} · {item.authorLabel} · {item.giftPaymentsCount} gift</p>
          </div>
          <div className="flex gap-1">
            <ActionButton icon={<Check className="h-4 w-4" />} label="Simpan" disabled={Boolean(busyAction)} tone="success" onClick={() => runAction("media.update", { id: item.id, caption, isAnonymous })} />
            {item.deletedAt ? (
              <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Restore" disabled={Boolean(busyAction)} onClick={() => runAction("media.restore", { id: item.id })} />
            ) : (
              <ActionButton icon={<X className="h-4 w-4" />} label="Soft delete" disabled={Boolean(busyAction)} onClick={() => runAction("media.softDelete", { id: item.id })} />
            )}
            <ActionButton icon={<Trash2 className="h-4 w-4" />} label="Hard delete" disabled={Boolean(busyAction)} tone="danger" onClick={() => runAction("media.hardDelete", { id: item.id })} />
          </div>
        </div>
        <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Caption" />
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} />
          Anonymous
        </label>
      </div>
    </article>
  );
}

function ServicesPanel({ data, busyAction, runAction }: { data: AdminData; busyAction: string; runAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="space-y-3">
      {data.services.map((service) => (
        <ServiceRow key={service.id} service={service} categories={data.categories.filter((category) => !category.deletedAt)} busyAction={busyAction} runAction={runAction} />
      ))}
    </section>
  );
}

function ServiceRow({ service, categories, busyAction, runAction }: { service: AdminService; categories: AdminCategory[]; busyAction: string; runAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState(service.title);
  const [categoryId, setCategoryId] = useState(service.categoryId);
  const [price, setPrice] = useState(String(service.price));
  const [description, setDescription] = useState(service.description);
  return (
    <article className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <StatusPill deletedAt={service.deletedAt} />
          <p className="mt-1 truncate text-sm font-bold text-gray-950">{service.title}</p>
          <p className="truncate text-xs text-gray-500">{service.provider} · {service.ownerLabel}</p>
          <p className="text-xs text-gray-500">{service.counts.media} media · {service.counts.reviews} review · {service.counts.inquiries} inquiry · {service.counts.reports} report</p>
        </div>
        <div className="flex gap-1">
          <ActionButton icon={<Check className="h-4 w-4" />} label="Simpan" disabled={Boolean(busyAction)} tone="success" onClick={() => runAction("service.update", { id: service.id, title, categoryId, price: Number(price), description })} />
          {service.deletedAt ? (
            <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Restore" disabled={Boolean(busyAction)} onClick={() => runAction("service.restore", { id: service.id })} />
          ) : (
            <ActionButton icon={<X className="h-4 w-4" />} label="Soft delete" disabled={Boolean(busyAction)} onClick={() => runAction("service.softDelete", { id: service.id })} />
          )}
          <ActionButton icon={<Trash2 className="h-4 w-4" />} label="Hard delete" disabled={Boolean(busyAction)} tone="danger" onClick={() => runAction("service.hardDelete", { id: service.id })} />
        </div>
      </div>
      <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="numeric" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm" />
    </article>
  );
}

function UsersPanel({ users, busyAction, runAction }: { users: AdminUser[]; busyAction: string; runAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="space-y-3">
      {users.map((user) => (
        <article key={user.id} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <StatusPill deletedAt={user.deletedAt} suspendedAt={user.suspendedAt} />
              <p className="mt-1 truncate text-sm font-bold text-gray-950">{user.label}</p>
              <p className="truncate text-xs text-gray-500">tg {user.telegramId ?? "-"} · bot {user.telegramChatId ? "connected" : "none"}</p>
              <p className="text-xs text-gray-500">{user.counts.providers} provider · {user.counts.media} media · {user.counts.withdraws} withdraw</p>
              <p className="text-xs font-bold text-gray-700">Saldo {formatRupiah(user.wallet?.balance ?? 0)} · pending {formatRupiah(user.wallet?.pendingWithdraw ?? 0)}</p>
            </div>
            <div className="flex gap-1">
              {user.suspendedAt || user.deletedAt ? (
                <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Restore" disabled={Boolean(busyAction)} onClick={() => runAction("user.restore", { id: user.id })} />
              ) : (
                <ActionButton icon={<X className="h-4 w-4" />} label="Suspend" disabled={Boolean(busyAction)} onClick={() => runAction("user.suspend", { id: user.id })} />
              )}
              {!user.deletedAt ? <ActionButton icon={<Trash2 className="h-4 w-4" />} label="Soft delete" disabled={Boolean(busyAction)} tone="danger" onClick={() => runAction("user.softDelete", { id: user.id })} /> : null}
              <ActionButton icon={<Trash2 className="h-4 w-4" />} label="Hard delete" disabled={Boolean(busyAction)} tone="danger" onClick={() => runAction("user.hardDelete", { id: user.id })} />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function NotificationsPanel({ users, busyAction, runAction }: { users: AdminUser[]; busyAction: string; runAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  const [userId, setUserId] = useState(users.find((user) => user.telegramChatId)?.id ?? "");
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await runAction("notification.send", { userId, text });
        setText("");
      }}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-3"
    >
      <select value={userId} onChange={(event) => setUserId(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
        {users.map((user) => (
          <option key={user.id} value={user.id} disabled={!user.telegramChatId}>
            {user.label}{user.telegramChatId ? "" : " · bot belum start"}
          </option>
        ))}
      </select>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Pesan bot ke user" />
      <button type="submit" disabled={Boolean(busyAction)} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 text-sm font-bold text-white disabled:bg-gray-300">
        <Bell className="h-4 w-4" />
        Kirim pesan
      </button>
    </form>
  );
}

function WithdrawPanel({ withdraws, busyAction, runAction }: { withdraws: AdminWithdraw[]; busyAction: string; runAction: (action: string, payload?: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="space-y-3">
      {withdraws.map((withdraw) => (
        <article key={withdraw.id} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${withdraw.status === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-700" : withdraw.status === "PAID" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{withdraw.status}</span>
              <p className="mt-1 truncate text-sm font-bold text-gray-950">{withdraw.userLabel}</p>
              <p className="text-xs text-gray-500">{withdraw.method} · {withdraw.accountName} · {withdraw.accountNumber}</p>
              <p className="text-xs font-bold text-gray-700">{formatRupiah(withdraw.amount)} · diterima {formatRupiah(withdraw.netAmount)} · admin {formatRupiah(withdraw.adminFee)}</p>
            </div>
            {withdraw.status === "PENDING" ? (
              <div className="flex gap-1">
                <ActionButton icon={<Check className="h-4 w-4" />} label="Paid" disabled={Boolean(busyAction)} tone="success" onClick={() => runAction("withdraw.paid", { id: withdraw.id })} />
                <ActionButton icon={<X className="h-4 w-4" />} label="Reject" disabled={Boolean(busyAction)} tone="danger" onClick={() => runAction("withdraw.reject", { id: withdraw.id })} />
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
