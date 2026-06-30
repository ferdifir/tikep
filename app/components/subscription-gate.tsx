"use client"

import { PremiumBadge } from "./premium-badge"
import { SubscribeButton } from "./subscribe-button"

interface Props {
  creatorId: number
  creatorUsername: string
  price: number | null
  isSubscribed: boolean
  onSubscribeToggle: () => void
}

export function SubscriptionGate({ creatorId, creatorUsername, price, isSubscribed, onSubscribeToggle }: Props) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-8">
      <PremiumBadge size="lg" />
      <p className="mt-3 text-center text-sm text-zinc-300">
        Konten ini hanya untuk subscriber
      </p>
      <div className="mt-4 w-full max-w-[200px]">
        <SubscribeButton
          creatorId={creatorId}
          creatorUsername={creatorUsername}
          price={price}
          isSubscribed={isSubscribed}
          onToggle={onSubscribeToggle}
        />
      </div>
    </div>
  )
}
