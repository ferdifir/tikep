"use client"

import { useEffect, useRef, useState } from "react"
import { useTg } from "./tg-provider"
import { addComment } from "@/app/actions/comment"
import type { CommentWithUser } from "@/app/lib/types"

export function CommentSheet({
  videoId,
  open,
  onClose,
}: {
  videoId: number
  open: boolean
  onClose: () => void
}) {
  const { initData } = useTg()
  const [visible, setVisible] = useState(false)
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setLoading(true)
      fetch(`/api/comments/${videoId}`)
        .then((r) => r.json())
        .then((data) => setComments(data.comments ?? []))
        .catch(() => {})
        .finally(() => setLoading(false))
      setTimeout(() => inputRef.current?.focus(), 350)
    } else {
      setVisible(false)
    }
  }, [open, videoId])

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      await addComment(videoId, trimmed, initData)
      setText("")
      const res = await fetch(`/api/comments/${videoId}`)
      const data = await res.json()
      setComments(data.comments ?? [])
    } catch {}
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-[55] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-zinc-900 rounded-t-2xl transition-transform duration-300 ease-out flex flex-col ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: "75vh" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 shrink-0">
          <h2 className="text-white font-semibold text-sm">Comments ({comments.length})</h2>
          <button onClick={onClose} className="text-white/60 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <p className="text-sm">Loading...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 animate-pulse">
              <svg
                viewBox="0 0 24 24"
                className="w-10 h-10 mb-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-sm">No comments yet</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-white font-bold text-xs">
                      {c.username?.[1]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-semibold text-sm">{c.username ?? "Anonymous"}</span>
                  <p className="text-white/80 text-sm">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-700 px-4 py-3 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add comment..."
            className="flex-1 bg-zinc-800 text-white text-sm rounded-full px-4 py-2 outline-none placeholder:text-zinc-500"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="text-sky-500 font-semibold text-sm disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}
