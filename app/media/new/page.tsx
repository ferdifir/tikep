"use client";

import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTikep } from "@/components/app-provider";

const maxUploadBytes = 25 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];

function getDisplayUsername(user: { username: string | null; firstName: string | null; lastName: string | null }) {
  if (user.username) {
    return `@${user.username}`;
  }

  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Tikep user";
}

export default function NewMediaPage() {
  const router = useRouter();
  const { currentUser } = useTikep();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previewUrlRef = useRef("");

  const authorLabel = useMemo(() => getDisplayUsername(currentUser), [currentUser]);
  const isVideo = file?.type.startsWith("video/") ?? false;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function replacePreviewFile(nextFile: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    if (!nextFile) {
      setPreviewUrl("");
      setFile(null);
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setFile(nextFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError("");

    if (!selectedFile) {
      replacePreviewFile(null);
      return;
    }

    if (!allowedTypes.includes(selectedFile.type)) {
      replacePreviewFile(null);
      setError("Pilih JPG, PNG, WebP, MP4, atau WebM.");
      return;
    }

    if (selectedFile.size > maxUploadBytes) {
      replacePreviewFile(null);
      setError("Ukuran file maksimal 25 MB.");
      return;
    }

    replacePreviewFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || isSubmitting) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("isAnonymous", String(isAnonymous));
    formData.append("caption", caption);

    const telegram = window as typeof window & {
      Telegram?: {
        WebApp?: {
          initData?: string;
        };
      };
    };
    const telegramInitData = telegram.Telegram?.WebApp?.initData;
    if (telegramInitData) {
      formData.append("initData", telegramInitData);
    }

    try {
      setError("");
      setIsSubmitting(true);
      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Media gagal diunggah.");
      }

      const data = (await response.json()) as { media: { id: string } };
      router.push(`/media/${data.media.id}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Media gagal diunggah.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-gray-200 p-2 text-gray-700 transition hover:bg-gray-50"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-gray-900">Share foto/video</h1>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
            <ImagePlus className="h-6 w-6" />
          </span>
          <span className="text-sm font-bold text-gray-900">{file ? file.name : "Pilih foto atau video"}</span>
          <span className="text-xs leading-5 text-gray-500">JPG, PNG, WebP, MP4, atau WebM. Maksimal 25 MB.</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={handleFileChange} className="sr-only" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Caption opsional</span>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={3}
            maxLength={160}
            placeholder="Catatan singkat untuk alt/arsip, tidak tampil di feed explore."
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
          <span>
            <span className="block text-sm font-bold text-gray-900">Share anonymous</span>
            <span className="block text-xs leading-5 text-gray-500">
              {isAnonymous
                ? "Nama kamu disembunyikan dan fitur gift tidak tersedia untuk media ini."
                : `Preview menampilkan by ${authorLabel}, dan orang bisa mengirim gift QRIS.`}
            </span>
          </span>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
            <div className="relative aspect-[4/5]">
              {previewUrl ? (
                isVideo ? (
                  <video src={previewUrl} className="h-full w-full object-cover" controls muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview upload" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}

              {!isAnonymous && previewUrl ? (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  by {authorLabel}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={!file || isSubmitting}
            className="flex h-11 min-w-28 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : file ? <Upload className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            Post
          </button>
        </section>
      </form>
    </div>
  );
}
