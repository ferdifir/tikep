"use client"

import { useEffect, useState } from "react"
import { useTg } from "@/app/components/tg-provider"
import { PremiumBadge } from "@/app/components/premium-badge"
import Link from "next/link"
import { toast } from "sonner"

interface Subscriber {
  id: number
  subscriberId: number
  startDate: string
  endDate: string
  active: boolean
  username: string | null
  fullName: string | null
}

export default function DashboardPage() {
  const { user, initData } = useTg()
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [price, setPrice] = useState(10)
  const [active, setActive] = useState(false)
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initData) return
    Promise.all([
      fetch(`/api/dashboard/data?initData=${encodeURIComponent(initData)}`).then((r) => r.json()),
      fetch(`/api/dashboard/subscribers?initData=${encodeURIComponent(initData)}`).then((r) => r.json()),
    ])
      .then(([data, subData]) => {
        setSubscriberCount(data.subscriberCount ?? 0)
        setPrice(data.subscriptionPrice ?? 10)
        setActive(data.subscriptionActive ?? false)
        setSubscribers(subData.subscribers ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initData])

  const savePlan = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/dashboard/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, price, active }),
      })
      if (res.ok) {
        toast.success("Subscription plan updated")
      } else {
        toast.error("Failed to save")
      }
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-dvh bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
        <Link href="/profile" className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Dashboard</h1>
        <div className="w-9" />
      </div>

      <div className="px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Subscribers</p>
            <p className="text-3xl font-bold mt-1">{subscriberCount}</p>
          </div>
          <div className="rounded-xl bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Price</p>
            <p className="text-3xl font-bold mt-1">{active ? `${price} ⭐` : "—"}</p>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Subscription Settings</h2>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Price (Stars per month)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Math.max(1, Math.min(10000, Number(e.target.value))))}
              min={1}
              max={10000}
              className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-amber-500"
            />
            Subscription active
          </label>
          <button
            onClick={savePlan}
            disabled={saving}
            className="w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="rounded-xl bg-zinc-900 p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Subscribers</h2>
          {subscribers.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-6">No subscribers yet</p>
          ) : (
            <div className="space-y-3">
              {subscribers.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.fullName ?? s.username ?? "User"}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(s.startDate).toLocaleDateString()} — {s.active && new Date(s.endDate) > new Date() ? "Active" : "Expired"}
                    </p>
                  </div>
                  {s.active && new Date(s.endDate) > new Date() && (
                    <span className="text-xs text-emerald-400">● Active</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
