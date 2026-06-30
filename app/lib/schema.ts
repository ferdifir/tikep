import { pgTable, serial, bigint, text, integer, timestamp, boolean, primaryKey, index } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique().notNull(),
  telegramUsername: text("telegram_username"),
  username: text("username").unique(),
  fullName: text("full_name"),
  bio: text("bio").default(""),
  avatarUrl: text("avatar_url"),
  subscriberCount: integer("subscriber_count").default(0).notNull(),
  subscriptionPrice: integer("subscription_price"),
  subscriptionActive: boolean("subscription_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caption: text("caption"),
  filePath: text("file_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  duration: integer("duration").default(0),
  shareCount: integer("share_count").default(0).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("videos_user_id_idx").on(t.userId)])

export const likes = pgTable("likes", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.videoId] }), index("likes_video_id_idx").on(t.videoId), index("likes_user_id_idx").on(t.userId)])

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("comments_video_id_idx").on(t.videoId)])

export const follows = pgTable("follows", {
  followerId: integer("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: integer("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.followerId, t.followingId] })])

export const saves = pgTable("saves", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.videoId] }), index("saves_user_id_idx").on(t.userId), index("saves_video_id_idx").on(t.videoId)])

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  telegramPaymentChargeId: text("telegram_payment_charge_id").unique().notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").default(true).notNull(),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("subscriptions_creator_idx").on(t.creatorId), index("subscriptions_subscriber_idx").on(t.subscriberId), index("subscriptions_subscriber_creator_idx").on(t.subscriberId, t.creatorId)])

export const notificationPreferences = pgTable("notification_preferences", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).primaryKey(),
  likeEnabled: boolean("like_enabled").default(true).notNull(),
  commentEnabled: boolean("comment_enabled").default(true).notNull(),
  followEnabled: boolean("follow_enabled").default(true).notNull(),
})
