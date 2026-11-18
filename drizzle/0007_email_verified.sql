ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL AND ("last_login_at" IS NOT NULL OR "password_hash" IS NOT NULL);
