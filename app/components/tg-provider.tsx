"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: Record<string, unknown>
        themeParams: Record<string, string>
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        ready: () => void
        expand: () => void
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (cb: () => void) => void
          offClick: (cb: () => void) => void
        }
        HapticFeedback: {
          impactOccurred: (style: string) => void
        }
        shareMessage: (msgId: string) => void
        CloudStorage: {
          getItem: (key: string, cb: (err: unknown, val: string) => void) => void
          setItem: (key: string, val: string, cb: (err: unknown, success: boolean) => void) => void
        }
      }
    }
  }
}

type WebApp = NonNullable<Window["Telegram"]>["WebApp"]

interface User {
  id: number
  telegramId: number
  username: string | null
  fullName: string | null
  bio: string | null
  avatarUrl: string | null
}

export interface PendingTgUser {
  id: number
  username: string | null
  firstName: string
  lastName: string | null
  photoUrl: string | null
}

const TgContext = createContext<{
  user: User | null
  initData: string
  tg: WebApp | null
  startParam: string
  pendingTgUser: PendingTgUser | null
  setUser: (u: User | null) => void
}>({ user: null, initData: "", tg: null, startParam: "", pendingTgUser: null, setUser: () => {} })

export function useTg() {
  return useContext(TgContext)
}

export function TGProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [pendingTgUser, setPendingTgUser] = useState<PendingTgUser | null>(null)
  const [ready, setReady] = useState(false)
  const [tgApi, setTgApi] = useState<WebApp | null>(null)
  const [navigated, setNavigated] = useState(false)

  useEffect(() => {
    setTgApi(window.Telegram?.WebApp ?? null)
  }, [])

  const tg = tgApi
  const initData = tg?.initData ?? ""
  const raw = tg?.initDataUnsafe as Record<string, unknown> | undefined
  const startParam = (raw?.start_param as string) ?? ""

  useEffect(() => {
    if (!tg) return
    tg.ready()
    tg.expand()

    const theme = tg.themeParams
    const root = document.documentElement
    if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color)
    if (theme.text_color) root.style.setProperty("--tg-text", theme.text_color)
    if (theme.hint_color) root.style.setProperty("--tg-hint", theme.hint_color)
    if (theme.link_color) root.style.setProperty("--tg-link", theme.link_color)
    if (theme.button_color) root.style.setProperty("--tg-button", theme.button_color)
    if (theme.button_text_color) root.style.setProperty("--tg-button-text", theme.button_text_color)
    if (theme.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", theme.secondary_bg_color)
    if (theme.header_bg_color) root.style.setProperty("--tg-header-bg", theme.header_bg_color)
    if (theme.accent_text_color) root.style.setProperty("--tg-accent", theme.accent_text_color)
    if (theme.destructive_text_color) root.style.setProperty("--tg-destructive", theme.destructive_text_color)
    if (theme.section_bg_color) root.style.setProperty("--tg-section-bg", theme.section_bg_color)
    if (theme.section_header_text_color) root.style.setProperty("--tg-section-header", theme.section_header_text_color)
    if (theme.subtitle_text_color) root.style.setProperty("--tg-subtitle", theme.subtitle_text_color)
    if (theme.bottom_bar_bg_color) root.style.setProperty("--tg-bottom-bar", theme.bottom_bar_bg_color)

    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.needsOnboarding) {
          setPendingTgUser(data.tgUser)
        } else if (data.user) {
          setUser(data.user)
        }
      })
      .catch(console.error)
      .finally(() => setReady(true))
  }, [tg, initData])

  useEffect(() => {
    if (!navigated && ready && startParam.startsWith("video_")) {
      setNavigated(true)
      const id = startParam.replace("video_", "")
      router.replace(`/watch/${id}`)
    }
  }, [ready, startParam, navigated, router])

  useEffect(() => {
    if (ready && pendingTgUser && !user) {
      router.replace("/onboarding")
    }
  }, [ready, pendingTgUser, user, router])

  if (!ready) {
    return <div className="h-dvh flex items-center justify-center bg-black text-white">Loading...</div>
  }

  return <TgContext.Provider value={{ user, initData, tg, startParam, pendingTgUser, setUser }}>{children}</TgContext.Provider>
}
