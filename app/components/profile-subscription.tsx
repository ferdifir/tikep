"use client"

import { useEffect, useState } from "react"
import { useTg } from "./tg-provider"
import { SubscribeButton } from "./subscribe-button"

interface Props {
  creatorId: number
  creatorUsername: string | null
}

export function ProfileSubscription({ creatorId, creatorUsername }: Props) {
  const { user, initData } = useTg()
  const [subscribed, setSubscribed] = useState(false)
  const [price, setPrice] = useState<number | null>(null)
  const [active, setActive] = useState(false)
  const [subCount, setSubCount] = useState(0)

  useEffect(() => {
    if (!initData) return
    fetch(`/api/subscriptions/${creatorId}?initData=${encodeURIComponent(initData)}`)
      .then((r) => r.json())
      .then((data) => {
        setSubscribed(data.subscribed ?? false)
        setPrice(data.subscriptionPrice ?? null)
        setActive(data.subscriptionActive ?? false)
        setSubCount(data.subscriberCount ?? 0)
      })
      .catch(() => {})
  }, [creatorId, initData])

  if (!active || !price || user?.id === creatorId) return null

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span>{subCount} subscriber{subCount !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{price} ⭐/month</span>
      </div>
      <SubscribeButton
        creatorId={creatorId}
        creatorUsername={creatorUsername ?? `user_${creatorId}`}
        price={price}
        isSubscribed={subscribed}
        onToggle={() => setSubscribed(!subscribed)}
      />
    </div>
  )
}
