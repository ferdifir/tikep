"use client";

import { CheckCircle2, MessageCircle, PlusCircle, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTikep } from "@/components/app-provider";
import { CustomSelect, type CustomSelectOption } from "@/components/custom-select";
import { getBotStartUrl } from "@/lib/telegram-webapp";
import type { ServiceCategory } from "@/lib/types";

const createCategoryValue = "__create_category__";

export default function PostPage() {
  const router = useRouter();
  const { addCategory, addService, categories, currentUser, refreshAppState } = useTikep();
  const telegramProviderName = useMemo(() => {
    const fullName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ").trim();
    return fullName || (currentUser.username ? `@${currentUser.username}` : "");
  }, [currentUser]);
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("");
  const [customCategory, setCustomCategory] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [botLink, setBotLink] = useState("");
  const coverPreviewUrlRef = useRef("");

  useEffect(() => {
    queueMicrotask(() => setBotLink(getBotStartUrl("bind_provider")));

    return () => {
      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const refreshWhenActive = () => {
      if (document.visibilityState === "visible") {
        refreshAppState().catch(() => undefined);
      }
    };

    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);

    return () => {
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    };
  }, [refreshAppState]);

  function replaceCoverFile(nextFile: File | null) {
    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
      coverPreviewUrlRef.current = "";
    }

    if (!nextFile) {
      setCoverFile(null);
      setCoverPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    coverPreviewUrlRef.current = objectUrl;
    setCoverFile(nextFile);
    setCoverPreviewUrl(objectUrl);
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError("");

    if (!selectedFile) {
      replaceCoverFile(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      replaceCoverFile(null);
      setError("Cover harus JPG, PNG, atau WebP.");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      replaceCoverFile(null);
      setError("Ukuran cover maksimal 25 MB.");
      return;
    }

    replaceCoverFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !coverFile) {
      return;
    }

    try {
      setError("");
      await addService({
        title,
        provider: providerName,
        category,
        price: Number(price),
        description,
        coverFile,
      });
      setSubmitted(true);
      setTitle("");
      if (!telegramProviderName) {
        setProvider("");
      }
      setCategory("");
      setPrice("");
      setDescription("");
      replaceCoverFile(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Produk/layanan gagal ditambahkan.");
    }
  }

  async function handleAddCategory() {
    const name = customCategory.trim();

    if (name.length < 2) {
      return;
    }

    try {
      setError("");
      const createdCategory = await addCategory(name);
      setCategory(createdCategory);
      setCustomCategory("");
      setCategoryModalOpen(false);
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : "Kategori gagal ditambahkan atau sudah ada.");
    }
  }

  const isBotConnected = Boolean(currentUser.telegramChatId && currentUser.botStartedAt);
  const hasTelegramUsername = Boolean(currentUser.username);
  const shouldShowBotNotice = !isBotConnected || !hasTelegramUsername;
  const providerName = telegramProviderName || provider.trim();
  const providerReadOnly = Boolean(telegramProviderName);
  const categoryOptions = useMemo<CustomSelectOption<string>[]>(() => {
    return [
      ...categories.map((item) => ({ value: item, label: item })),
      { value: createCategoryValue, label: "Buat kategori", description: "Tambah kategori baru" },
    ];
  }, [categories]);

  const canSubmit =
    title.trim().length >= 4 &&
    Boolean(coverFile) &&
    providerName.length >= 2 &&
    category.trim().length >= 2 &&
    Number(price) > 0 &&
    description.trim().length >= 12;

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Buat produk/layanan</h1>
              <p className="text-xs leading-5 text-gray-500">Post baru akan muncul di feed dan profil.</p>
            </div>
          </div>
        </section>

        {shouldShowBotNotice ? (
          <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <div className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-semibold leading-5 text-indigo-900">
                  Hubungkan bot dan atur username Telegram agar notifikasi pesanan bisa dikirim.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {!isBotConnected ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                      Bot belum terhubung
                    </span>
                  ) : null}
                  {!hasTelegramUsername ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                      Username belum ada
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  {!isBotConnected && botLink ? (
                    <a href={botLink} className="inline-flex text-xs font-bold text-indigo-700">
                      Hubungkan bot
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => refreshAppState().catch(() => undefined)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Cek ulang
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {submitted ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Produk/layanan berhasil ditambahkan.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Cover foto</span>
          <div className="grid grid-cols-[112px_1fr] gap-3">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <div className="relative aspect-square">
                {coverPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreviewUrl} alt="Preview cover produk atau layanan" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                )}
              </div>
            </div>
            <label className="flex cursor-pointer flex-col justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-sm text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50/40">
              <span className="font-bold text-gray-900">{coverFile ? coverFile.name : "Pilih cover foto"}</span>
              <span className="mt-1 text-xs leading-5 text-gray-500">JPG, PNG, atau WebP. Cover tampil di card dan profil.</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} className="sr-only" />
            </label>
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Judul produk/layanan</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Contoh: Paket Brand Kit UMKM"
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Penyedia</span>
          <input
            value={providerReadOnly ? telegramProviderName : provider}
            onChange={(event) => setProvider(event.target.value)}
            readOnly={providerReadOnly}
            placeholder="Nama penyedia"
            className={`h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${
              providerReadOnly ? "bg-gray-50 font-semibold text-gray-700" : ""
            }`}
          />
          {providerReadOnly ? (
            <span className="text-xs font-medium text-gray-500">Nama penyedia menggunakan nama dari Telegram.</span>
          ) : null}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Kategori</span>
            <CustomSelect
              value={category}
              options={categoryOptions}
              placeholder="Pilih kategori"
              onChange={(value) => {
                if (value === createCategoryValue) {
                  setCategoryModalOpen(true);
                  return;
                }
                setCategory(value);
              }}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Harga</span>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="numeric"
              type="number"
              min="1"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Deskripsi</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Jelaskan produk, hasil kerja, deliverable, dan batasannya."
            rows={5}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-11 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Terbitkan
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Feed
          </button>
        </div>
      </form>

      {categoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <section className="w-full rounded-lg bg-white p-4 shadow-xl sm:max-w-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Buat kategori</h2>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Nama kategori</span>
              <input
                value={customCategory}
                onChange={(event) => setCustomCategory(event.target.value)}
                placeholder="Contoh: Fotografi produk"
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={customCategory.trim().length < 2}
                className="h-11 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Simpan
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
