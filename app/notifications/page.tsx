"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTg } from "@/app/components/tg-provider"
import { toast } from "sonner"

export default function NotificationsPage() {
  const { initData } = useTg()
  const [likeEnabled, setLikeEnabled] = useState(true)
  const [commentEnabled, setCommentEnabled] = useState(true)
  const [followEnabled, setFollowEnabled] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!initData) return
    fetch(`/api/notifications/preferences?initData=${encodeURIComponent(initData)}`)
      .then((r) => r.json())
      .then((data) => {
        setLikeEnabled(data.likeEnabled ?? true)
        setCommentEnabled(data.commentEnabled ?? true)
        setFollowEnabled(data.followEnabled ?? true)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [initData])

  async function toggle(field: "likeEnabled" | "commentEnabled" | "followEnabled", value: boolean) {
    if (field === "likeEnabled") setLikeEnabled(value)
    if (field === "commentEnabled") setCommentEnabled(value)
    if (field === "followEnabled") setFollowEnabled(value)

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, likeEnabled, commentEnabled, followEnabled }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error("Failed to save")
      if (field === "likeEnabled") setLikeEnabled(!value)
      if (field === "commentEnabled") setCommentEnabled(!value)
      if (field === "followEnabled") setFollowEnabled(!value)
    }
  }

  if (!loaded) {
    return (
      <div className="min-h-dvh bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="h-16 bg-zinc-900 flex items-center justify-between px-4">
        <Link href="/profile" className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-white font-semibold">Notifications</h1>
        <div className="w-9" />
      </div>

      <div className="p-4 space-y-4">
        <p className="text-xs text-zinc-500">Choose which notifications you receive via bot chat.</p>

        <ToggleRow
          label="Likes"
          description="Someone likes your video"
          enabled={likeEnabled}
          onChange={(v) => toggle("likeEnabled", v)}
        />
        <ToggleRow
          label="Comments"
          description="Someone comments on your video"
          enabled={commentEnabled}
          onChange={(v) => toggle("commentEnabled", v)}
        />
        <ToggleRow
          label="Follows"
          description="Someone follows you"
          enabled={followEnabled}
          onChange={(v) => toggle("followEnabled", v)}
        />
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-white text-sm font-semibold">{label}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-7 rounded-full transition-colors relative ${enabled ? "bg-[--tg-button,#8774e1]" : "bg-zinc-700"}`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  )
}
