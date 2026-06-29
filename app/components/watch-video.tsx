"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import type { VideoWithUser } from "@/app/lib/types"
import { CommentSheet } from "./comment-sheet"
import { toggleLike } from "@/app/actions/like"
import { toggleSave } from "@/app/actions/save"
import { toggleFollow } from "@/app/actions/follow"
import { useTg } from "./tg-provider"
import { toast } from "sonner"

function isVideo(duration: number | null): boolean {
  return (duration ?? 0) > 0
}

export default function WatchVideo({ video }: { video: VideoWithUser }) {
  const router = useRouter()
  const { user, initData } = useTg()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [liked, setLiked] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)
  const [likeCount, setLikeCount] = useState(video.likeCount)
  const [saved, setSaved] = useState(false)
  const [saveCount, setSaveCount] = useState(video.saveCount)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [followed, setFollowed] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const [fading, setFading] = useState(false)
  const isOwn = user?.id === video.userId
  const isVid = isVideo(video.duration)

  useEffect(() => {
    fetch("/api/user-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData,
        videoIds: [video.id],
        targetUserIds: isOwn ? [] : [video.userId],
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setLiked(data.likes?.includes(video.id) ?? false)
        setSaved(data.saves?.includes(video.id) ?? false)
        if (!isOwn) setFollowed(data.follows?.includes(video.userId) ?? false)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isVid) return
    const el = videoRef.current
    if (!el) return
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    return () => {
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
    }
  }, [isVid])

  const handleLike = () => {
    const next = !liked
    setLiked(next)
    setLikeAnim(true)
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
    setTimeout(() => setLikeAnim(false), 200)
    toggleLike(video.id, initData).catch(() => {
      setLiked(!next)
      setLikeCount((c) => (next ? Math.max(0, c - 1) : c + 1))
    })
  }

  const handleFollow = () => {
    if (!video.username) return
    setFollowed(true)
    setShowLabel(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFading(true))
    })
    setTimeout(() => {
      setShowLabel(false)
      setFading(false)
    }, 800)
    toggleFollow(video.username, initData).catch(() => {
      setFollowed(false)
      setShowLabel(false)
      setFading(false)
    })
  }

  const handleShare = async () => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, initData }),
      })
      if (res.ok) {
        const { botUsername } = await res.json()
        toast.success(`Sent! Open the message from @${botUsername} to watch.`)
      } else {
        toast.error("Share failed")
      }
    } catch {
      toast.error("Share failed")
    }
  }

  const handleSave = () => {
    const next = !saved
    setSaved(next)
    setSaveCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
    toggleSave(video.id, initData).catch(() => {
      setSaved(!next)
      setSaveCount((c) => (next ? Math.max(0, c - 1) : c + 1))
    })
  }

  function handleTogglePlay() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
    setShowOverlay(true)
    clearTimeout(overlayTimer.current)
    overlayTimer.current = setTimeout(() => setShowOverlay(false), 800)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
  }

  const username = video.username ?? `@user_${video.userId}`
  const profileHref = `/@${username.replace("@", "")}`

  return (
    <div className="relative h-dvh w-full bg-black overflow-hidden">
      {isVid ? (
        <video
          ref={videoRef}
          src={video.filePath}
          className="absolute inset-0 w-full h-full object-contain"
          loop
          muted
          autoPlay
          playsInline
          onClick={handleTogglePlay}
        />
      ) : (
        <img
          src={video.filePath}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      {isVid && (
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 z-10 ${showOverlay ? "opacity-100" : "opacity-0"}`}
        >
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            {paused ? (
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white ml-0.5" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            )}
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <div className="absolute right-4 bottom-4 flex flex-col items-center gap-5 z-10">
        <Link
          href={profileHref}
          className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shrink-0"
        >
          {video.avatarUrl ? (
            <img src={video.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/20 text-white font-bold text-sm">
              {username[1]?.toUpperCase() ?? "?"}
            </div>
          )}
        </Link>

        <button
          onClick={handleLike}
          className={`flex flex-col items-center gap-1 transition-transform ${likeAnim ? "scale-125" : "scale-100"}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-8 h-8 ${liked ? "fill-red-500 text-red-500" : "text-white"}`}
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-white text-xs font-semibold">{likeCount}</span>
        </button>

        <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-white text-xs font-semibold">{video.commentCount}</span>
        </button>

        <button onClick={handleSave} className="flex flex-col items-center gap-1">
          <svg
            viewBox="0 0 24 24"
            className={`w-7 h-7 ${saved ? "fill-yellow-500 text-yellow-500" : "text-white"}`}
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-white text-xs font-semibold">{saveCount}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span className="text-white text-xs font-semibold">{video.shareCount}</span>
        </button>

        {isVid && (
          <button onClick={toggleMute} className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              {muted ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      <div className="absolute left-4 bottom-4 right-20 z-10">
        <div className="flex items-center gap-2 mb-2">
          <Link href={profileHref} className="text-white font-bold text-sm">
            {username}
          </Link>
          {!isOwn && !followed ? (
            <button
              onClick={handleFollow}
              className="text-xs font-semibold px-2 py-0.5 rounded border border-white text-white transition-all duration-300 hover:bg-white/20"
            >
              Follow
            </button>
          ) : null}
          {showLabel && (
            <span
              className={`text-xs font-semibold text-white/60 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
            >
              Following
            </span>
          )}
        </div>
        {video.caption ? (
          <p className="text-white text-sm leading-tight line-clamp-3">{video.caption}</p>
        ) : null}
      </div>

      <CommentSheet videoId={video.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </div>
  )
}
