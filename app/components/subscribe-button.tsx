"use client"

import { useState } from "react"
import { useTg } from "./tg-provider"

interface Props {
  creatorId: number
  creatorUsername: string
  price: number | null
  isSubscribed: boolean
  onToggle: () => void
}

export function SubscribeButton({ creatorId, creatorUsername, price, isSubscribed, onToggle }: Props) {
  const { tg, initData } = useTg()
  const [loading, setLoading] = useState(false)

  if (price == null || price <= 0) return null

  const handleSubscribe = async () => {
    if (!tg) return
    setLoading(true)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, initData }),
      })
      const data = await res.json()
      if (!data.invoiceUrl) throw new Error(data.error ?? "Failed to create invoice")

      tg.openInvoice(data.invoiceUrl, (status) => {
        if (status === "paid") {
          onToggle()
        }
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      await fetch("/api/subscribe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, initData }),
      })
      onToggle()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (isSubscribed) {
    return (
      <button
        onClick={handleUnsubscribe}
        disabled={loading}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "..." : "Subscribed"}
      </button>
    )
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
    >
      {loading ? "..." : `Subscribe ${price} ⭐/month`}
    </button>
  )
}
