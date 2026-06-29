"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTg } from "@/app/components/tg-provider"
import { toast } from "sonner"

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = searchParams.get("edit") === "1"
  const { initData, user, pendingTgUser, setUser } = useTg()

  const defaultAvatar = isEdit
    ? (user?.avatarUrl ?? "")
    : (pendingTgUser?.photoUrl ?? "")
  const defaultUsername = isEdit ? (user?.username ?? "") : (pendingTgUser?.username ?? "")
  const defaultFullName = isEdit
    ? (user?.fullName ?? "")
    : (pendingTgUser ? [pendingTgUser.firstName, pendingTgUser.lastName].filter(Boolean).join(" ") : "")
  const defaultBio = user?.bio ?? ""

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(defaultAvatar)
  const [username, setUsername] = useState(defaultUsername)
  const [fullName, setFullName] = useState(defaultFullName)
  const [bio, setBio] = useState(defaultBio)
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUsername(defaultUsername)
    setFullName(defaultFullName)
  }, [defaultUsername, defaultFullName])

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSubmit() {
    if (!initData || saving) return
    if (!username.trim() || !fullName.trim()) {
      toast.error("Username and name are required")
      return
    }

    setSaving(true)

    let uploadedAvatarUrl: string | null = null
    if (avatarFile) {
      const fd = new FormData()
      fd.append("avatar", avatarFile)
      fd.append("initData", initData)
      const avatarRes = await fetch("/api/upload/avatar", { method: "POST", body: fd })
      if (avatarRes.ok) {
        const data = await avatarRes.json()
        uploadedAvatarUrl = data.avatarUrl
      }
    }

    if (isEdit && user) {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          username: username.trim(),
          fullName: fullName.trim(),
          bio: bio.trim(),
          avatarUrl: uploadedAvatarUrl,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        toast.success("Profile updated")
        router.back()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to update")
      }
    } else {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          username: username.trim(),
          fullName: fullName.trim(),
          bio: bio.trim(),
          avatarUrl: uploadedAvatarUrl,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        toast.success("Welcome!")
        router.replace("/")
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to register")
      }
    }

    setSaving(false)
  }

  function useTelegramData() {
    if (!pendingTgUser || user) return
    setUsername(pendingTgUser.username ?? "")
    setFullName([pendingTgUser.firstName, pendingTgUser.lastName].filter(Boolean).join(" "))
    setBio("")
  }

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isEdit ? "Edit Profile" : "Welcome!"}</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {isEdit ? "Update your profile info" : "Set up your profile to get started"}
          </p>
        </div>

        {!isEdit && pendingTgUser && (
          <button
            onClick={useTelegramData}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
          >
            Use Telegram name & username
          </button>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-700 relative"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white text-3xl font-bold">
                  ?
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarSelect} />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Username</label>
            <div className="flex items-center gap-1 bg-zinc-900 rounded-xl px-4 py-3">
              <span className="text-zinc-500">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-transparent outline-none flex-1 text-white text-sm"
                placeholder="username"
                maxLength={30}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-900 rounded-xl px-4 py-3 outline-none text-white text-sm"
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Bio (optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-zinc-900 rounded-xl px-4 py-3 outline-none text-white text-sm resize-none"
              placeholder="Tell us about yourself"
              rows={3}
              maxLength={150}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[--tg-button,#8774e1] text-white font-semibold text-sm disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Profile"}
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-black text-white flex items-center justify-center">Loading...</div>}>
      <OnboardingForm />
    </Suspense>
  )
}
