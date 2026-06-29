ALTER TABLE "users" ADD COLUMN "telegram_username" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "thumbnail_path" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "share_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");