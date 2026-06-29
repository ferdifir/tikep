"use client"

import Link from "next/link"
import { useState, useRef, useEffect, useCallback } from "react"
import { FeedItem } from "./feed-item"
import { useTg } from "./tg-provider"
import type { VideoWithUser } from "@/app/lib/types"

export function FeedPage({
  initialFeed,
  initialCursor,
  initialHasMore,
}: {
  initialFeed: VideoWithUser[]
  initialCursor: string | null
  initialHasMore: boolean
}) {
  const [tab, setTab] = useState<"for-you" | "following">("for-you")
  const [feed, setFeed] = useState<VideoWithUser[]>(initialFeed)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [authError, setAuthError] = useState(false)
  const { initData } = useTg()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const tabRef = useRef(tab)
  tabRef.current = tab

  const fetchFollowing = useCallback(async (pageCursor?: string | null) => {
    if (!initData) {
      setAuthError(true)
      return
    }
    if (!pageCursor) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setAuthError(false)
    try {
      const params = new URLSearchParams({ tab: "following", initData })
      if (pageCursor) params.set("cursor", pageCursor)
      const res = await fetch(`/api/feed?${params}`)
      if (res.status === 401) {
        setAuthError(true)
        if (!pageCursor) setFeed([])
        return
      }
      const data = await res.json()
      if (pageCursor) {
        setFeed((prev) => [...prev, ...(data.feed ?? [])])
      } else {
        setFeed(data.feed ?? [])
      }
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch {
      if (!pageCursor) setFeed([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [initData])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    if (tabRef.current === "for-you") {
      if (!cursor && !initData) return
      setLoadingMore(true)
      const params = new URLSearchParams({ tab: "for-you" })
      if (cursor) params.set("cursor", cursor)
      if (initData) params.set("initData", initData)
      fetch(`/api/feed?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setFeed((prev) => [...prev, ...(data.feed ?? [])])
          setCursor(data.nextCursor)
          setHasMore(data.hasMore)
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false))
    } else {
      fetchFollowing(cursor)
    }
  }, [cursor, hasMore, loadingMore, initData, fetchFollowing])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: "200px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    if (tab === "for-you") {
      setFeed(initialFeed)
      setCursor(initialCursor)
      setHasMore(initialHasMore)
      setAuthError(false)
    } else {
      setCursor(null)
      setHasMore(false)
      fetchFollowing()
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex gap-6 pointer-events-auto">
          <TabButton active={tab === "following"} onClick={() => setTab("following")}>
            Following
          </TabButton>
          <TabButton active={tab === "for-you"} onClick={() => setTab("for-you")}>
            For You
          </TabButton>
        </div>
        <Link
          href="/search"
          className="pointer-events-auto p-1 text-white/70 hover:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>
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
        {loadingMore && (
          <div className="flex items-center justify-center py-4 bg-black">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {hasMore && !loadingMore && feed.length > 0 && <div ref={sentinelRef} className="h-4" />}
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
      className={`relative text-sm font-semibold pb-1 transition-colors ${
        active ? "text-white" : "text-white/50"
      }`}
    >
      {children}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-white" />}
    </button>
  )
}
