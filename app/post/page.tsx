"use client";

import { CheckCircle2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTikep } from "@/components/app-provider";
import { categories } from "@/lib/seed-data";
import type { ServiceCategory } from "@/lib/types";

export default function PostPage() {
  const router = useRouter();
  const { addService } = useTikep();
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("Tikep Studio");
  const [category, setCategory] = useState<ServiceCategory>("Desain");
  const [price, setPrice] = useState("199000");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    addService({
      title,
      provider,
      category,
      price: Number(price),
      description,
    });
    setSubmitted(true);
    setTitle("");
    setProvider("Tikep Studio");
    setCategory("Desain");
    setPrice("199000");
    setDescription("");
  }

  const canSubmit = title.trim().length >= 4 && provider.trim().length >= 2 && Number(price) > 0 && description.trim().length >= 12;

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
