"use client"

import Link from "next/link"
import { useTg } from "@/app/components/tg-provider"
import { useState, useEffect, useRef } from "react"

interface SearchUser {
  id: number
  username: string | null
  fullName: string | null
  bio: string | null
  avatarUrl: string | null
  followerCount: number
}

export default function SearchPage() {
  const { initData } = useTg()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim() || !initData) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(query.trim())}&initData=${encodeURIComponent(initData)}`)
        if (!res.ok) return
        const data = await res.json()
        setResults(data.users ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query, initData])

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="p-1 -ml-1 text-white/70 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-zinc-800 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <svg viewBox="0 0 24 24" className="w-10 h-10 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-sm">No users found</p>
          </div>
        )}

        {!loading && !query.trim() && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <svg viewBox="0 0 24 24" className="w-10 h-10 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-sm">Search by username or name</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((u) => (
              <Link
                key={u.id}
                href={`/@${u.username ?? `user_${u.id}`}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-11 h-11 shrink-0 rounded-full overflow-hidden bg-zinc-700">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                      {(u.fullName ?? u.username ?? "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.fullName ?? "User"}</p>
                  <p className="text-xs text-zinc-400 truncate">@{u.username ?? `user_${u.id}`}</p>
                  {u.bio && <p className="text-xs text-zinc-500 truncate mt-0.5">{u.bio}</p>}
                </div>
                <div className="shrink-0 text-xs text-zinc-500">
                  {u.followerCount} followers
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
