CREATE TABLE "notification_preferences" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"like_enabled" boolean DEFAULT true NOT NULL,
	"comment_enabled" boolean DEFAULT true NOT NULL,
	"follow_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;