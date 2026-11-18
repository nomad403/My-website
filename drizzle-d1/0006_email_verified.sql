ALTER TABLE users ADD COLUMN email_verified_at INTEGER CHECK (email_verified_at BETWEEN -8640000000000000 AND 8640000000000000);
--> statement-breakpoint
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL AND (last_login_at IS NOT NULL OR password_hash IS NOT NULL);
