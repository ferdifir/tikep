"use client"

import { useState, useRef, useEffect } from "react"
import { useTg } from "@/app/components/tg-provider"
import { useRouter } from "next/navigation"
import CameraViewfinder from "@/app/components/camera-viewfinder"
import { toast } from "sonner"

export default function UploadPage() {
  const { initData } = useTg()
  const router = useRouter()
  const [showCamera, setShowCamera] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [isImage, setIsImage] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setIsImage(f.type.startsWith("image/"))
    setPreview(URL.createObjectURL(f))
    setShowCamera(false)
  }

  const selectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    handleFile(f)
  }

  const backToCamera = () => {
    setFile(null)
    setPreview(null)
    setCaption("")
    setShowCamera(true)
    if (inputRef.current) inputRef.current.value = ""
  }

  const submit = async () => {
    if (!file || uploading) return

    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("caption", caption)
    fd.append("initData", initData)
    fd.append("isPremium", isPremium ? "1" : "0")

    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (res.ok) {
      toast.success(isImage ? "Photo uploaded!" : "Video uploaded!")
      backToCamera()
      setUploading(false)
      setTimeout(() => router.push("/"), 800)
    } else {
      try {
        const err = await res.json()
        toast.error(err.error || `Upload failed (${res.status})`)
      } catch {
        toast.error(`Upload failed (${res.status})`)
      }
      setUploading(false)
    }
  }

  if (showCamera) {
    return (
      <div className="h-[calc(100dvh-56px)]">
        <CameraViewfinder
          onCapture={handleFile}
          onClose={() => router.back()}
          onGallery={() => inputRef.current?.click()}
        />
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
          onChange={selectFile}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-56px)] bg-black text-white">
      <div className="relative h-full w-full">
        {isImage ? (
          <img src={preview!} alt="" className="h-full w-full object-contain" />
        ) : (
          <video
            src={preview!}
            className="h-full w-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

        <button
          onClick={backToCamera}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        <div className="absolute bottom-6 left-4 right-4 z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add caption..."
              className="flex-1 bg-white/10 backdrop-blur-md text-white text-sm rounded-xl px-4 py-3 outline-none placeholder:text-white/50 border border-white/10"
            />
            <button
              onClick={submit}
              disabled={uploading}
              className="shrink-0 px-6 py-3 rounded-xl bg-[--tg-button,#8774e1] text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
            >
              {uploading ? "Posting..." : "Post"}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="accent-amber-500"
            />
            Konten Premium (hanya subscriber)
          </label>
        </div>
      </div>
    </div>
  )
}
