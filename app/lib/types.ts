export interface VideoWithUser {
  id: number
  caption: string | null
  filePath: string
  duration: number | null
  createdAt: Date | null

  userId: number
  username: string | null
  fullName: string | null
  avatarUrl: string | null

  likeCount: number
  commentCount: number
  shareCount: number
  saveCount: number
  isPremium: boolean
}

export interface SubscriptionPlan {
  userId: number
  subscriptionPrice: number | null
  subscriptionActive: boolean
  subscriberCount: number
}

export interface Subscription {
  id: number
  subscriberId: number
  creatorId: number
  startDate: Date
  endDate: Date
  active: boolean
  autoRenew: boolean
}

export interface CommentWithUser {
  id: number
  text: string
  createdAt: Date | null

  userId: number
  username: string | null
  avatarUrl: string | null
}
