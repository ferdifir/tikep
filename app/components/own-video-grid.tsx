"use client"

import Link from "next/link"
import { useState } from "react"
import { useTg } from "@/app/components/tg-provider"
import { deleteVideo } from "@/app/actions/video"
import { toast } from "sonner"

interface GridVideo {
  id: number
  filePath: string
  thumbnailPath?: string | null
  duration?: number | null
}

interface Props {
  videos: GridVideo[]
  profileUserId: number
  showDelete?: boolean
}

export default function OwnVideoGrid({ videos, profileUserId, showDelete = true }: Props) {
  const { user, initData } = useTg()
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set())

  const isOwn = user?.id === profileUserId && showDelete
  const visible = videos.filter((v) => !deletedIds.has(v.id))

  async function handleDelete(videoId: number) {
    if (!initData) return
    toast("Delete this video?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteVideo(videoId, initData)
            setDeletedIds((prev) => new Set(prev).add(videoId))
            toast.success("Video deleted")
          } catch {
            toast.error("Failed to delete video")
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
      duration: 5000,
    })
  }

  if (visible.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1">
        <div className="col-span-3 py-12 text-center text-zinc-500 text-sm">No videos yet</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {visible.map((v) => (
        <div key={v.id} className="relative aspect-[3/4] bg-zinc-800 flex items-center justify-center overflow-hidden group">
          <Link href={`/watch/${v.id}`} className="absolute inset-0 z-10 flex items-center justify-center">
            {v.thumbnailPath ? (
              <img src={v.thumbnailPath} alt="" className="h-full w-full object-cover" />
            ) : (v.duration ?? 0) > 0 ? (
              <video src={v.filePath} className="h-full w-full object-cover" preload="metadata" muted />
            ) : (
              <img src={v.filePath} alt="" className="h-full w-full object-cover" />
            )}
          </Link>
          {isOwn && (
            <button
              onClick={() => handleDelete(v.id)}
              className="absolute top-1 right-1 z-20 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
