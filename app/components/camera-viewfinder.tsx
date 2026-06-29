"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
  onGallery?: () => void
}

export default function CameraViewfinder({ onCapture, onClose, onGallery }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [facing, setFacing] = useState<"user" | "environment">("user")
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const startTimeRef = useRef(0)
  const tickerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const startStream = useCallback(async (f: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: f, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
    } catch {
      // camera not available
    }
  }, [])

  useEffect(() => {
    startStream(facing)
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [facing, startStream])

  function cleanup() {
    clearTimeout(holdTimer.current)
    clearInterval(tickerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" })
      cleanup()
      onCapture(file)
    }, "image/jpeg", 0.92)
  }

  function beginRecording() {
    const stream = streamRef.current
    if (!stream) return

    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm"
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime })
      const ext = mime === "video/mp4" ? "mp4" : "webm"
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: mime })
      cleanup()
      onCapture(file)
    }

    recorder.start(100)
    setRecording(true)
    startTimeRef.current = Date.now()
    setElapsed(0)

    tickerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(e)
      if (e >= 30) {
        if (recorder.state === "recording") recorder.stop()
        setRecording(false)
        clearInterval(tickerRef.current)
      }
    }, 100)
  }

  function endRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state === "recording") {
      recorder.stop()
      setRecording(false)
      clearInterval(tickerRef.current)
    }
  }

  function handlePointerDown() {
    startTimeRef.current = Date.now()

    holdTimer.current = setTimeout(() => {
      // Still held after 300ms → start video
      beginRecording()
    }, 300)
  }

  function handlePointerUp() {
    clearTimeout(holdTimer.current)

    const held = Date.now() - startTimeRef.current
    if (held < 300 && !recorderRef.current) {
      // Quick tap → photo
      capturePhoto()
      return
    }

    // Video recording was started
    endRecording()
  }

  function handlePointerLeave() {
    clearTimeout(holdTimer.current)
    endRecording()
  }

  function switchCamera() {
    setFacing((f) => (f === "user" ? "environment" : "user"))
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      <button
        onClick={() => {
          cleanup()
          onClose()
        }}
        className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>

      {recording && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-sm font-mono">{fmt(elapsed)}</span>
        </div>
      )}

      {!recording && (
        <p className="absolute bottom-[116px] left-0 right-0 text-center text-white/50 text-xs z-10">
          Tap for photo · Hold for video
        </p>
      )}

      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-12 z-10">
        <button
          onClick={switchCamera}
          className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={`w-[72px] h-[72px] rounded-full border-4 transition-all duration-150 ${
            recording ? "border-red-500 scale-90" : "border-white"
          }`}
        >
          <div
            className={`w-full h-full rounded-full transition-all duration-150 ${
              recording ? "bg-red-500 scale-50 rounded-lg" : "bg-white/60 scale-75"
            }`}
          />
        </button>

        {onGallery && (
          <button
            onClick={onGallery}
            className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
