"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { FeedItem } from "./feed-item"
import { useTg } from "./tg-provider"
import type { VideoWithUser } from "@/app/lib/types"

export function FeedPage({ initialFeed }: { initialFeed: VideoWithUser[] }) {
  const [tab, setTab] = useState<"for-you" | "following">("for-you")
  const [feed, setFeed] = useState<VideoWithUser[]>(initialFeed)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(false)
  const { initData } = useTg()
  const fetchedRef = useRef(false)

  const fetchFollowing = useCallback(async () => {
    if (!initData) {
      setAuthError(true)
      setFeed([])
      return
    }
    setLoading(true)
    setAuthError(false)
    try {
      const res = await fetch(`/api/feed?tab=following&initData=${encodeURIComponent(initData)}`)
      if (res.status === 401) {
        setAuthError(true)
        setFeed([])
        return
      }
      const data = await res.json()
      setFeed(data.feed ?? [])
    } catch {
      setFeed([])
    } finally {
      setLoading(false)
    }
  }, [initData])

  useEffect(() => {
    fetchedRef.current = false
  }, [tab])

  useEffect(() => {
    if (tab === "for-you") {
      setFeed(initialFeed)
    } else if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchFollowing()
    }
  }, [tab, initialFeed, fetchFollowing])

  const emptyMessage =
    tab === "following"
      ? authError
        ? "Open this app in Telegram to see your following feed"
        : feed.length === 0 && !loading
          ? "Follow users to see their videos here"
          : null
      : feed.length === 0
        ? "No videos yet. Upload the first one!"
        : null

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-3 pb-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex gap-1 rounded-lg bg-black/40 p-1 pointer-events-auto">
          <TabButton active={tab === "for-you"} onClick={() => setTab("for-you")}>
            For You
          </TabButton>
          <TabButton active={tab === "following"} onClick={() => setTab("following")}>
            Following
          </TabButton>
        </div>
      </div>

      <div className="h-[calc(100dvh-56px)] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none">
        {emptyMessage && (
          <div className="h-full w-full flex items-center justify-center bg-black text-zinc-500 px-4 text-center">
            <p className="text-sm">{emptyMessage}</p>
          </div>
        )}
        {feed.map((item) => (
          <FeedItem key={item.id} video={item} />
        ))}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-white text-sm">Loading...</p>
          </div>
        )}
      </div>
    </>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
        active ? "bg-white text-black" : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}
