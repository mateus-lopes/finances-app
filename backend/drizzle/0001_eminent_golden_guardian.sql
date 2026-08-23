ALTER TABLE "accounts" ADD COLUMN "is_real" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_initial_balance" boolean DEFAULT false NOT NULL;