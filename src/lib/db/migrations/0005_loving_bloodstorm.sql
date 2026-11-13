ALTER TABLE "feeds" ADD COLUMN "last_attempt_at" timestamp;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "next_attempt_at" timestamp;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "needs_attention" boolean DEFAULT false NOT NULL;