"use client";

import { CheckCircle2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useTikep } from "@/components/app-provider";
import type { ServiceCategory } from "@/lib/types";

export default function PostPage() {
  const router = useRouter();
  const { addCategory, addService, categories, currentUser } = useTikep();
  const defaultProvider = useMemo(() => {
    return [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || currentUser.username || "Penyedia Tikep";
  }, [currentUser]);
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("Desain");
  const [customCategory, setCustomCategory] = useState("");
  const [price, setPrice] = useState("199000");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setError("");
      await addService({
        title,
        provider: provider.trim() || defaultProvider,
        category,
        price: Number(price),
        description,
      });
      setSubmitted(true);
      setTitle("");
      setProvider("");
      setCategory("Desain");
      setPrice("199000");
      setDescription("");
    } catch {
      setError("Layanan gagal ditambahkan.");
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
    } catch {
      setError("Kategori gagal ditambahkan atau sudah ada.");
    }
  }

  const canSubmit =
    title.trim().length >= 4 &&
    (provider.trim() || defaultProvider).length >= 2 &&
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
              <h1 className="text-base font-bold text-gray-900">Buat layanan</h1>
              <p className="text-xs leading-5 text-gray-500">Post baru akan muncul di feed dan profil.</p>
            </div>
          </div>
        </section>

        {submitted ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Layanan berhasil ditambahkan.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Judul layanan</span>
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
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            placeholder={defaultProvider}
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Kategori</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as ServiceCategory)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Kategori baru</span>
            <input
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              placeholder="Contoh: Fotografi"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={customCategory.trim().length < 2}
            className="mt-6 h-11 rounded-lg border border-gray-200 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            Tambah
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Deskripsi</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Jelaskan hasil kerja, deliverable, dan batasan layanan."
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
    </div>
  );
}
