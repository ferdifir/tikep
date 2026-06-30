"use client"

import Link from "next/link"
import { useTg } from "@/app/components/tg-provider"
import { useEffect, useState, useRef } from "react"
import OwnVideoGrid from "@/app/components/own-video-grid"
import type { VideoWithUser } from "@/app/lib/types"
import { toast } from "sonner"

type Tab = "posts" | "saved"

export default function ProfilePage() {
  const { user, initData, setUser } = useTg()
  const [videos, setVideos] = useState<VideoWithUser[]>([])
  const [savedVideos, setSavedVideos] = useState<VideoWithUser[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [tab, setTab] = useState<Tab>("posts")
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetch(`/api/users/${user.id}/videos`)
      .then((r) => r.json())
      .then((data) => setVideos(data.videos ?? []))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    fetch(`/api/users/${user.id}/saves`)
      .then((r) => r.json())
      .then((data) => setSavedVideos(data.videos ?? []))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    fetch(`/api/users/${user.id}/stats`)
      .then((r) => r.json())
      .then((data) => {
        setFollowerCount(data.followerCount ?? 0)
        setFollowingCount(data.followingCount ?? 0)
      })
      .catch(() => {})
  }, [user])

  const [shareLoading, setShareLoading] = useState(false)

  async function handleShareProfile() {
    if (!initData) return
    setShareLoading(true)
    try {
      const res = await fetch("/api/share/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      })
      if (!res.ok) { toast.error("Share failed"); return }
      const data = await res.json()
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.switchInlineQuery) {
        window.Telegram.WebApp.switchInlineQuery(data.shareText, ["users", "groups", "channels"])
      } else {
        await navigator.clipboard.writeText(data.shareText)
        toast.success("Link copied!")
      }
    } catch {
      toast.error("Share failed")
    } finally {
      setShareLoading(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !initData) return

    const fd = new FormData()
    fd.append("avatar", file)
    fd.append("initData", initData)

    const res = await fetch("/api/upload/avatar", { method: "POST", body: fd })
    if (res.ok) {
      const data = await res.json()
      setUser(data.user)
      toast.success("Avatar updated")
    } else {
      toast.error("Failed to upload avatar")
    }
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="flex flex-col items-center px-4 pt-6 pb-4">
        <button
          onClick={() => avatarInputRef.current?.click()}
          className="w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-800 mb-3"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white text-3xl font-bold">
              {(user.fullName ?? "U")[0]}
            </div>
          )}
        </button>
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />

        <h1 className="text-lg font-bold">{user.fullName ?? "User"}</h1>
        <p className="text-zinc-500 text-sm">@{user.username ?? `user_${user.telegramId}`}</p>
        {user.bio && <p className="text-zinc-400 text-sm mt-1 text-center max-w-xs">{user.bio}</p>}

        <div className="flex gap-8 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold">{followingCount}</p>
            <p className="text-[11px] text-zinc-500">Following</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{followerCount}</p>
            <p className="text-[11px] text-zinc-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{videos.length}</p>
            <p className="text-[11px] text-zinc-500">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{savedVideos.length}</p>
            <p className="text-[11px] text-zinc-500">Saved</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 w-full max-w-sm">
          <Link
            href="/onboarding?edit=1"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm font-medium text-white text-center hover:bg-zinc-800 transition-colors"
          >
            Edit Profile
          </Link>
          <button
            onClick={handleShareProfile}
            disabled={shareLoading}
            className="rounded-lg border border-zinc-700 bg-zinc-900 py-2 px-3 text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
          <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
          <span className="text-zinc-700">·</span>
          <Link href="/notifications" className="hover:text-zinc-300 transition-colors">Notifications</Link>
        </div>
      </div>

      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setTab("posts")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
            tab === "posts" ? "text-white border-b-2 border-white" : "text-zinc-500"
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setTab("saved")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
            tab === "saved" ? "text-white border-b-2 border-white" : "text-zinc-500"
          }`}
        >
          Saved
        </button>
      </div>

      <div className="px-1 pt-1">
        {tab === "posts" ? (
          <OwnVideoGrid videos={videos} profileUserId={user.id} />
        ) : (
          <OwnVideoGrid videos={savedVideos} profileUserId={user.id} showDelete={false} />
        )}
      </div>
    </div>
  )
}
