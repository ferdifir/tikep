import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tikep - Not Found",
  description: "This page could not be found.",
}

export default function NotFound() {
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-black text-white px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#8774e1] flex items-center justify-center mb-6">
        <span className="text-3xl font-bold text-white">T</span>
      </div>
      <h1 className="text-6xl font-bold mb-2">404</h1>
      <p className="text-lg text-zinc-400 mb-8">Halaman tidak ditemukan</p>
      <p className="text-sm text-zinc-600 max-w-xs">
        Halaman ini hanya bisa diakses melalui Telegram.
      </p>
    </div>
  )
}
