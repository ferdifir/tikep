import { pgTable, serial, bigint, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique().notNull(),
  telegramUsername: text("telegram_username"),
  username: text("username").unique(),
  fullName: text("full_name"),
  bio: text("bio").default(""),
  avatarUrl: text("avatar_url"),
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
  createdAt: timestamp("created_at").defaultNow(),
})

export const likes = pgTable("likes", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.videoId] })])

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const follows = pgTable("follows", {
  followerId: integer("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: integer("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.followerId, t.followingId] })])

export const saves = pgTable("saves", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.videoId] })])
