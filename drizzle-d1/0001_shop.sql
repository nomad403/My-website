-- Fresh D1 schema matching PostgreSQL migrations 0001 through 0005.
-- Dates: UTC epoch milliseconds; Stripe event_created: seconds; amounts: integer cents.
-- Never apply PostgreSQL migrations from drizzle/ to this database.

CREATE TABLE users (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  email text NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('client','admin')) NOT NULL DEFAULT 'client',
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER CHECK (updated_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  last_login_at INTEGER CHECK (last_login_at BETWEEN -8640000000000000 AND 8640000000000000),
  disabled_at INTEGER CHECK (disabled_at BETWEEN -8640000000000000 AND 8640000000000000)
) STRICT;

--> statement-breakpoint

CREATE TABLE customer_profiles (
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  company text,
  billing_email text NOT NULL,
  locale text NOT NULL DEFAULT 'fr',
  stripe_customer_id text UNIQUE,
  cgv_version text,
  cgv_accepted_at INTEGER CHECK (cgv_accepted_at BETWEEN -8640000000000000 AND 8640000000000000),
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER CHECK (updated_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

CREATE TABLE projects (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER CHECK (updated_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

CREATE INDEX projects_user_id_idx ON projects (user_id);

--> statement-breakpoint

CREATE TABLE plans (
  code text PRIMARY KEY,
  visibility TEXT CHECK (visibility IN ('public','private')) NOT NULL,
  monthly_amount_cents INTEGER CHECK (monthly_amount_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  yearly_amount_cents INTEGER CHECK (yearly_amount_cents BETWEEN -2147483648 AND 2147483647),
  currency text NOT NULL DEFAULT 'EUR',
  active INTEGER CHECK (active IN (0,1)) NOT NULL DEFAULT 1,
  CONSTRAINT plans_monthly_positive CHECK (monthly_amount_cents > 0),
  CONSTRAINT plans_yearly_positive CHECK (yearly_amount_cents IS NULL OR yearly_amount_cents > 0),
  CONSTRAINT plans_currency_eur CHECK (currency = 'EUR')
) STRICT;

--> statement-breakpoint

CREATE TABLE subscriptions (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  project_id TEXT CHECK (length(project_id)=36 AND project_id GLOB '????????-????-????-????-????????????' AND length(replace(project_id,'-',''))=32 AND replace(project_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') REFERENCES projects (id) ON DELETE SET NULL,
  plan_code text NOT NULL REFERENCES plans (code),
  status TEXT CHECK (status IN ('incomplete','incomplete_expired','trialing','active','past_due','unpaid','canceled')) NOT NULL DEFAULT 'incomplete',
  billing_interval TEXT CHECK (billing_interval IN ('month','year')) NOT NULL,
  amount_cents INTEGER CHECK (amount_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  private_offer INTEGER CHECK (private_offer IN (0,1)) NOT NULL DEFAULT 0,
  commercial_terms text NOT NULL DEFAULT 'catalog-v1',
  current_period_start INTEGER CHECK (current_period_start BETWEEN -8640000000000000 AND 8640000000000000),
  current_period_end INTEGER CHECK (current_period_end BETWEEN -8640000000000000 AND 8640000000000000),
  cancel_requested_at INTEGER CHECK (cancel_requested_at BETWEEN -8640000000000000 AND 8640000000000000),
  cancel_effective_at INTEGER CHECK (cancel_effective_at BETWEEN -8640000000000000 AND 8640000000000000),
  stripe_subscription_id text UNIQUE,
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER CHECK (updated_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  CONSTRAINT subscriptions_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT subscriptions_currency_eur CHECK (currency = 'EUR')
) STRICT;

--> statement-breakpoint

CREATE INDEX subscriptions_user_id_idx ON subscriptions (user_id);

--> statement-breakpoint

CREATE INDEX subscriptions_status_idx ON subscriptions (status);

--> statement-breakpoint

CREATE TABLE invoices (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  subscription_id TEXT CHECK (length(subscription_id)=36 AND subscription_id GLOB '????????-????-????-????-????????????' AND length(replace(subscription_id,'-',''))=32 AND replace(subscription_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') REFERENCES subscriptions (id) ON DELETE SET NULL,
  stripe_invoice_id text UNIQUE,
  status TEXT CHECK (status IN ('draft','open','paid','uncollectible','void')) NOT NULL,
  amount_due_cents INTEGER CHECK (amount_due_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  amount_paid_cents INTEGER CHECK (amount_paid_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  amount_remaining_cents INTEGER CHECK (amount_remaining_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  issued_at INTEGER CHECK (issued_at BETWEEN -8640000000000000 AND 8640000000000000),
  paid_at INTEGER CHECK (paid_at BETWEEN -8640000000000000 AND 8640000000000000),
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  CONSTRAINT invoices_due_nonnegative CHECK (amount_due_cents >= 0),
  CONSTRAINT invoices_paid_nonnegative CHECK (amount_paid_cents >= 0),
  CONSTRAINT invoices_remaining_nonnegative CHECK (amount_remaining_cents >= 0),
  CONSTRAINT invoices_currency_eur CHECK (currency = 'EUR')
) STRICT;

--> statement-breakpoint

CREATE INDEX invoices_user_id_idx ON invoices (user_id);

--> statement-breakpoint

CREATE TABLE payments (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  invoice_id TEXT CHECK (length(invoice_id)=36 AND invoice_id GLOB '????????-????-????-????-????????????' AND length(replace(invoice_id,'-',''))=32 AND replace(invoice_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') REFERENCES invoices (id) ON DELETE SET NULL,
  stripe_payment_intent_id text UNIQUE,
  status TEXT CHECK (status IN ('pending','succeeded','failed','canceled')) NOT NULL,
  amount_cents INTEGER CHECK (amount_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  failure_code text,
  paid_at INTEGER CHECK (paid_at BETWEEN -8640000000000000 AND 8640000000000000),
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  CONSTRAINT payments_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT payments_currency_eur CHECK (currency = 'EUR')
) STRICT;

--> statement-breakpoint

CREATE INDEX payments_user_id_idx ON payments (user_id);

--> statement-breakpoint

CREATE TABLE refunds (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  payment_id TEXT CHECK (length(payment_id)=36 AND payment_id GLOB '????????-????-????-????-????????????' AND length(replace(payment_id,'-',''))=32 AND replace(payment_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  stripe_refund_id text UNIQUE,
  status TEXT CHECK (status IN ('pending','succeeded','failed','canceled')) NOT NULL,
  amount_cents INTEGER CHECK (amount_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  CONSTRAINT refunds_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT refunds_currency_eur CHECK (currency = 'EUR')
) STRICT;

--> statement-breakpoint

CREATE INDEX refunds_payment_id_idx ON refunds (payment_id);

--> statement-breakpoint

CREATE TABLE sessions (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  secret_hash text NOT NULL UNIQUE,
  expires_at INTEGER CHECK (expires_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL,
  absolute_expires_at INTEGER CHECK (absolute_expires_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL,
  last_seen_at INTEGER CHECK (last_seen_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  revoked_at INTEGER CHECK (revoked_at BETWEEN -8640000000000000 AND 8640000000000000),
  mfa_verified_at INTEGER CHECK (mfa_verified_at BETWEEN -8640000000000000 AND 8640000000000000),
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

--> statement-breakpoint

CREATE TABLE magic_links (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at INTEGER CHECK (expires_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL,
  consumed_at INTEGER CHECK (consumed_at BETWEEN -8640000000000000 AND 8640000000000000),
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

CREATE INDEX magic_links_email_idx ON magic_links (email);

--> statement-breakpoint

CREATE TABLE admin_totp (
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  secret_ciphertext text NOT NULL,
  confirmed_at INTEGER CHECK (confirmed_at BETWEEN -8640000000000000 AND 8640000000000000),
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

CREATE TABLE recovery_codes (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at INTEGER CHECK (used_at BETWEEN -8640000000000000 AND 8640000000000000),
  CONSTRAINT recovery_codes_user_hash_unique UNIQUE (user_id, code_hash)
) STRICT;

--> statement-breakpoint

CREATE TABLE audit_logs (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  actor_user_id TEXT CHECK (length(actor_user_id)=36 AND actor_user_id GLOB '????????-????-????-????-????????????' AND length(replace(actor_user_id,'-',''))=32 AND replace(actor_user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata TEXT CHECK (json_valid(metadata)) NOT NULL DEFAULT '{}',
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id);

--> statement-breakpoint

CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);

--> statement-breakpoint

INSERT INTO plans (code, visibility, monthly_amount_cents, yearly_amount_cents, currency, active)
VALUES
  ('essential', 'public', 1900, 19000, 'EUR', 1),
  ('plus', 'public', 4900, 49000, 'EUR', 1),
  ('premium', 'public', 6900, 69000, 'EUR', 1),
  ('friend_host', 'private', 1000, NULL, 'EUR', 1),
  ('friend_care', 'private', 2000, NULL, 'EUR', 1)
ON CONFLICT (code) DO UPDATE SET
  visibility = EXCLUDED.visibility,
  monthly_amount_cents = EXCLUDED.monthly_amount_cents,
  yearly_amount_cents = EXCLUDED.yearly_amount_cents,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active;

--> statement-breakpoint

ALTER TABLE subscriptions ADD COLUMN last_event_created INTEGER CHECK (last_event_created BETWEEN -9007199254740991 AND 9007199254740991) NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE invoices ADD COLUMN last_event_created INTEGER CHECK (last_event_created BETWEEN -9007199254740991 AND 9007199254740991) NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE payments ADD COLUMN last_event_created INTEGER CHECK (last_event_created BETWEEN -9007199254740991 AND 9007199254740991) NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE refunds ADD COLUMN last_event_created INTEGER CHECK (last_event_created BETWEEN -9007199254740991 AND 9007199254740991) NOT NULL DEFAULT 0;

--> statement-breakpoint

CREATE TABLE promotion_codes (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  code_hash text NOT NULL UNIQUE,
  plan_code text NOT NULL REFERENCES plans (code),
  expires_at INTEGER CHECK (expires_at BETWEEN -8640000000000000 AND 8640000000000000),
  max_redemptions INTEGER CHECK (max_redemptions BETWEEN -2147483648 AND 2147483647),
  redemption_count INTEGER CHECK (redemption_count BETWEEN -2147483648 AND 2147483647) NOT NULL DEFAULT 0,
  restricted_email text,
  disabled_at INTEGER CHECK (disabled_at BETWEEN -8640000000000000 AND 8640000000000000),
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  CONSTRAINT promotion_codes_private_plan CHECK (plan_code IN ('friend_host', 'friend_care')),
  CONSTRAINT promotion_codes_max_positive CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  CONSTRAINT promotion_codes_count_nonnegative CHECK (redemption_count >= 0)
) STRICT;

--> statement-breakpoint

CREATE TABLE promotion_redemptions (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  promotion_code_id TEXT CHECK (length(promotion_code_id)=36 AND promotion_code_id GLOB '????????-????-????-????-????????????' AND length(replace(promotion_code_id,'-',''))=32 AND replace(promotion_code_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES promotion_codes (id) ON DELETE RESTRICT,
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status text NOT NULL,
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  updated_at INTEGER CHECK (updated_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  CONSTRAINT promotion_redemptions_status CHECK (status IN ('reserved', 'consumed', 'released'))
) STRICT;

--> statement-breakpoint

CREATE INDEX promotion_redemptions_code_idx ON promotion_redemptions (promotion_code_id);

--> statement-breakpoint

CREATE TABLE checkout_sessions (
  id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE,
  url text,
  plan_code text NOT NULL,
  billing_interval TEXT CHECK (billing_interval IN ('month','year')) NOT NULL,
  amount_cents INTEGER CHECK (amount_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
  redemption_id TEXT CHECK (length(redemption_id)=36 AND redemption_id GLOB '????????-????-????-????-????????????' AND length(replace(redemption_id,'-',''))=32 AND replace(redemption_id,'-','') NOT GLOB '*[^0-9a-fA-F]*'),
  status text NOT NULL DEFAULT 'open',
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
  CONSTRAINT checkout_sessions_status CHECK (status IN ('open', 'complete', 'expired', 'failed')),
  CONSTRAINT checkout_sessions_amount_positive CHECK (amount_cents > 0)
) STRICT;

--> statement-breakpoint

CREATE INDEX checkout_sessions_user_idx ON checkout_sessions (user_id);

--> statement-breakpoint

CREATE UNIQUE INDEX checkout_sessions_one_open_idx
  ON checkout_sessions (user_id, plan_code, billing_interval)
  WHERE status = 'open';

--> statement-breakpoint

CREATE TABLE stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

ALTER TABLE promotion_codes ADD COLUMN code_hint text;

--> statement-breakpoint

ALTER TABLE promotion_codes ADD COLUMN usage_terms text NOT NULL DEFAULT 'catalog-v1';

--> statement-breakpoint

ALTER TABLE promotion_codes ADD COLUMN internal_notes text NOT NULL DEFAULT '';

--> statement-breakpoint

ALTER TABLE promotion_codes ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;

--> statement-breakpoint

ALTER TABLE promotion_codes ADD COLUMN changed_by TEXT REFERENCES users(id) ON DELETE SET NULL;

--> statement-breakpoint

ALTER TABLE subscriptions ADD COLUMN promotion_redemption_id TEXT REFERENCES promotion_redemptions(id) ON DELETE RESTRICT;

--> statement-breakpoint

CREATE INDEX subscriptions_promotion_redemption_idx ON subscriptions(promotion_redemption_id);

--> statement-breakpoint

CREATE UNIQUE INDEX promotion_redemptions_one_reserved_idx ON promotion_redemptions(promotion_code_id, user_id) WHERE status = 'reserved';

--> statement-breakpoint

CREATE INDEX audit_logs_promotion_idx ON audit_logs (json_extract(metadata,'$.promotionId'), created_at);

--> statement-breakpoint

ALTER TABLE subscriptions ADD COLUMN service_anchor_at INTEGER CHECK (service_anchor_at BETWEEN -8640000000000000 AND 8640000000000000);

--> statement-breakpoint

ALTER TABLE subscriptions ADD COLUMN entitlement_review_required INTEGER CHECK (entitlement_review_required IN (0,1)) NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE invoices ADD COLUMN service_period_start INTEGER CHECK (service_period_start BETWEEN -8640000000000000 AND 8640000000000000);

--> statement-breakpoint

ALTER TABLE invoices ADD COLUMN service_period_end INTEGER CHECK (service_period_end BETWEEN -8640000000000000 AND 8640000000000000);

--> statement-breakpoint

ALTER TABLE invoices ADD COLUMN service_subscription_id text;

--> statement-breakpoint

CREATE UNIQUE INDEX projects_id_owner_idx ON projects(id, user_id);

--> statement-breakpoint

CREATE UNIQUE INDEX subscriptions_id_owner_idx ON subscriptions(id, user_id);

--> statement-breakpoint

CREATE TABLE intervention_requests (
 id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
 user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 project_id TEXT CHECK (length(project_id)=36 AND project_id GLOB '????????-????-????-????-????????????' AND length(replace(project_id,'-',''))=32 AND replace(project_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL,
 subscription_id TEXT CHECK (length(subscription_id)=36 AND subscription_id GLOB '????????-????-????-????-????????????' AND length(replace(subscription_id,'-',''))=32 AND replace(subscription_id,'-','') NOT GLOB '*[^0-9a-fA-F]*'),
 submission_key TEXT CHECK (length(submission_key)=36 AND submission_key GLOB '????????-????-????-????-????????????' AND length(replace(submission_key,'-',''))=32 AND replace(submission_key,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL,
 payload_hash text NOT NULL,
 subject text NOT NULL CHECK (length(subject) BETWEEN 3 AND 160),
 description text NOT NULL CHECK (length(description) BETWEEN 10 AND 4000),
 category text NOT NULL CHECK (category IN ('minor_fix','content','visual','maintenance','incident','other')),
 urgency text NOT NULL CHECK (urgency IN ('low','normal','high')),
 additional_info text NOT NULL DEFAULT '' CHECK (length(additional_info) <= 2000),
 status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','analyzing','accepted','in_progress','waiting_client','completed','rejected','cancelled')),
 minor_scope_confirmed INTEGER CHECK (minor_scope_confirmed IN (0,1)) NOT NULL DEFAULT 0,
 coverage text NOT NULL DEFAULT 'unreviewed' CHECK (coverage IN ('unreviewed','included','outside')),
 created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
 updated_at INTEGER CHECK (updated_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
 UNIQUE(user_id, submission_key),
 FOREIGN KEY(project_id, user_id) REFERENCES projects(id, user_id) ON DELETE RESTRICT,
 FOREIGN KEY(subscription_id, user_id) REFERENCES subscriptions(id, user_id) ON DELETE RESTRICT
) STRICT;

--> statement-breakpoint

CREATE INDEX intervention_requests_owner_idx ON intervention_requests(user_id, created_at);

--> statement-breakpoint

CREATE TABLE intervention_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
 request_id TEXT CHECK (length(request_id)=36 AND request_id GLOB '????????-????-????-????-????????????' AND length(replace(request_id,'-',''))=32 AND replace(request_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES intervention_requests(id) ON DELETE RESTRICT,
 actor_id TEXT CHECK (length(actor_id)=36 AND actor_id GLOB '????????-????-????-????-????????????' AND length(replace(actor_id,'-',''))=32 AND replace(actor_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 actor_role text NOT NULL CHECK (actor_role IN ('client','admin')),
 kind text NOT NULL CHECK (kind IN ('created','message','status','time','priority')),
 internal INTEGER CHECK (internal IN (0,1)) NOT NULL DEFAULT 0,
 body text NOT NULL DEFAULT '' CHECK (length(body) <= 4000),
 from_status text,
 to_status text,
 operation_key TEXT CHECK (length(operation_key)=36 AND operation_key GLOB '????????-????-????-????-????????????' AND length(replace(operation_key,'-',''))=32 AND replace(operation_key,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL,
 payload_hash text NOT NULL,
 created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
 UNIQUE(request_id, actor_id, operation_key)
) STRICT;

--> statement-breakpoint

CREATE INDEX intervention_events_request_idx ON intervention_events(request_id, created_at);

--> statement-breakpoint

CREATE TABLE intervention_periods (
 id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
 subscription_id TEXT CHECK (length(subscription_id)=36 AND subscription_id GLOB '????????-????-????-????-????????????' AND length(replace(subscription_id,'-',''))=32 AND replace(subscription_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 period_start INTEGER CHECK (period_start BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL,
 period_end INTEGER CHECK (period_end BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL,
 included_minutes INTEGER CHECK (included_minutes BETWEEN -2147483648 AND 2147483647) NOT NULL DEFAULT 60 CHECK (included_minutes = 60),
 consumed_minutes INTEGER CHECK (consumed_minutes BETWEEN -2147483648 AND 2147483647) NOT NULL DEFAULT 0 CHECK (consumed_minutes BETWEEN 0 AND included_minutes),
 CHECK (period_end > period_start),
 UNIQUE(subscription_id, period_start)
) STRICT;

--> statement-breakpoint

CREATE TABLE intervention_time_entries (
 id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
 request_id TEXT CHECK (length(request_id)=36 AND request_id GLOB '????????-????-????-????-????????????' AND length(replace(request_id,'-',''))=32 AND replace(request_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL UNIQUE REFERENCES intervention_requests(id) ON DELETE RESTRICT,
 subscription_id TEXT CHECK (length(subscription_id)=36 AND subscription_id GLOB '????????-????-????-????-????????????' AND length(replace(subscription_id,'-',''))=32 AND replace(subscription_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') REFERENCES subscriptions(id) ON DELETE RESTRICT,
 period_id TEXT CHECK (length(period_id)=36 AND period_id GLOB '????????-????-????-????-????????????' AND length(replace(period_id,'-',''))=32 AND replace(period_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') REFERENCES intervention_periods(id) ON DELETE RESTRICT,
 actor_id TEXT CHECK (length(actor_id)=36 AND actor_id GLOB '????????-????-????-????-????????????' AND length(replace(actor_id,'-',''))=32 AND replace(actor_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 minutes INTEGER CHECK (minutes BETWEEN -2147483648 AND 2147483647) NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
 coverage text NOT NULL CHECK (coverage IN ('included','outside')),
 performed_at INTEGER CHECK (performed_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL,
 created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)),
 CHECK ((coverage = 'included' AND period_id IS NOT NULL AND subscription_id IS NOT NULL AND minutes <= 60)
     OR (coverage = 'outside' AND period_id IS NULL))
) STRICT;

--> statement-breakpoint

CREATE TABLE intervention_outbox (
 id TEXT CHECK (length(id)=36 AND id GLOB '????????-????-????-????-????????????' AND length(replace(id,'-',''))=32 AND replace(id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random() % 4)+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
 event_id TEXT CHECK (length(event_id)=36 AND event_id GLOB '????????-????-????-????-????????????' AND length(replace(event_id,'-',''))=32 AND replace(event_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL UNIQUE REFERENCES intervention_events(id) ON DELETE RESTRICT,
 user_id TEXT CHECK (length(user_id)=36 AND user_id GLOB '????????-????-????-????-????????????' AND length(replace(user_id,'-',''))=32 AND replace(user_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 audience text NOT NULL CHECK (audience IN ('client','admin')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
 created_at INTEGER CHECK (created_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

ALTER TABLE intervention_requests ADD COLUMN internal_priority text NOT NULL DEFAULT 'normal'
 CHECK (internal_priority IN ('low','normal','high','urgent'));

--> statement-breakpoint

ALTER TABLE refunds ADD COLUMN succeeded_event_at INTEGER CHECK (succeeded_event_at BETWEEN -8640000000000000 AND 8640000000000000);

--> statement-breakpoint

CREATE INDEX admin_users_created_idx ON users(created_at, id);

--> statement-breakpoint

CREATE INDEX admin_invoices_issued_idx ON invoices(issued_at, id);

--> statement-breakpoint

CREATE INDEX admin_payments_paid_idx ON payments(paid_at, id);

--> statement-breakpoint

CREATE INDEX admin_refunds_success_idx ON refunds(succeeded_event_at, id);

--> statement-breakpoint

CREATE INDEX admin_interventions_status_idx ON intervention_requests(status, created_at, id);

--> statement-breakpoint

CREATE TABLE subscription_observations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 subscription_id TEXT CHECK (length(subscription_id)=36 AND subscription_id GLOB '????????-????-????-????-????????????' AND length(replace(subscription_id,'-',''))=32 AND replace(subscription_id,'-','') NOT GLOB '*[^0-9a-fA-F]*') NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 status text NOT NULL,
 amount_cents INTEGER CHECK (amount_cents BETWEEN -2147483648 AND 2147483647) NOT NULL,
 billing_interval text NOT NULL,
 current_period_start INTEGER CHECK (current_period_start BETWEEN -8640000000000000 AND 8640000000000000),
 current_period_end INTEGER CHECK (current_period_end BETWEEN -8640000000000000 AND 8640000000000000),
 cancel_requested_at INTEGER CHECK (cancel_requested_at BETWEEN -8640000000000000 AND 8640000000000000),
 cancel_effective_at INTEGER CHECK (cancel_effective_at BETWEEN -8640000000000000 AND 8640000000000000),
 review_required INTEGER CHECK (review_required IN (0,1)) NOT NULL,
 stripe_event_created INTEGER CHECK (stripe_event_created BETWEEN -9007199254740991 AND 9007199254740991) NOT NULL,
 recorded_at INTEGER CHECK (recorded_at BETWEEN -8640000000000000 AND 8640000000000000) NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
) STRICT;

--> statement-breakpoint

CREATE INDEX subscription_observations_sub_idx ON subscription_observations(subscription_id, id);

--> statement-breakpoint

CREATE TABLE billing_sync_lock (id integer PRIMARY KEY CHECK(id=1)) STRICT;

--> statement-breakpoint

INSERT INTO billing_sync_lock(id) VALUES(1);

--> statement-breakpoint

ALTER TABLE invoices ADD COLUMN total_cents INTEGER CHECK (total_cents BETWEEN -2147483648 AND 2147483647);

--> statement-breakpoint

CREATE TRIGGER promotion_terms_immutable BEFORE UPDATE ON promotion_codes WHEN NEW.code_hash IS NOT OLD.code_hash OR NEW.plan_code IS NOT OLD.plan_code OR NEW.expires_at IS NOT OLD.expires_at OR NEW.max_redemptions IS NOT OLD.max_redemptions OR NEW.restricted_email IS NOT OLD.restricted_email OR NEW.usage_terms IS NOT OLD.usage_terms OR NEW.code_hint IS NOT OLD.code_hint OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'Promotion terms are immutable'); END;

--> statement-breakpoint

CREATE TRIGGER promotion_disabled_immutable BEFORE UPDATE ON promotion_codes WHEN OLD.disabled_at IS NOT NULL AND NEW.disabled_at IS NOT OLD.disabled_at BEGIN SELECT RAISE(ABORT,'A disabled promotion cannot be reactivated'); END;

--> statement-breakpoint

CREATE TRIGGER promotion_admin_created AFTER INSERT ON promotion_codes BEGIN INSERT INTO audit_logs(actor_user_id,action,metadata) VALUES(NEW.changed_by,'promotion.created',json_object('promotionId',NEW.id)); END;

--> statement-breakpoint

CREATE TRIGGER promotion_admin_disabled AFTER UPDATE ON promotion_codes WHEN NEW.disabled_at IS NOT OLD.disabled_at BEGIN INSERT INTO audit_logs(actor_user_id,action,metadata) VALUES(NEW.changed_by,'promotion.disabled',json_object('promotionId',NEW.id)); END;

--> statement-breakpoint

CREATE TRIGGER promotion_admin_notes AFTER UPDATE ON promotion_codes WHEN NEW.internal_notes IS NOT OLD.internal_notes BEGIN INSERT INTO audit_logs(actor_user_id,action,metadata) VALUES(NEW.changed_by,'promotion.notes_updated',json_object('promotionId',NEW.id)); END;

--> statement-breakpoint

CREATE TRIGGER promotion_redemption_ownership BEFORE UPDATE ON promotion_redemptions WHEN NEW.promotion_code_id IS NOT OLD.promotion_code_id OR NEW.user_id IS NOT OLD.user_id OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'Redemption ownership is immutable'); END;

--> statement-breakpoint

CREATE TRIGGER promotion_redemption_final BEFORE UPDATE ON promotion_redemptions WHEN OLD.status <> 'reserved' AND NEW.status IS NOT OLD.status BEGIN SELECT RAISE(ABORT,'A final redemption cannot change'); END;

--> statement-breakpoint

CREATE TRIGGER promotion_redemption_created AFTER INSERT ON promotion_redemptions BEGIN INSERT INTO audit_logs(actor_user_id,action,metadata) VALUES(NEW.user_id,'promotion.reserved',json_object('promotionId',NEW.promotion_code_id,'redemptionId',NEW.id,'userId',NEW.user_id)); END;

--> statement-breakpoint

CREATE TRIGGER promotion_redemption_changed AFTER UPDATE ON promotion_redemptions WHEN NEW.status IS NOT OLD.status BEGIN INSERT INTO audit_logs(actor_user_id,action,metadata) VALUES(NULL,CASE NEW.status WHEN 'consumed' THEN 'promotion.consumed' WHEN 'released' THEN 'promotion.released' ELSE 'promotion.invalid' END,json_object('promotionId',NEW.promotion_code_id,'redemptionId',NEW.id,'userId',NEW.user_id)); END;

--> statement-breakpoint

CREATE TRIGGER intervention_time_immutable_update BEFORE UPDATE ON intervention_time_entries BEGIN SELECT RAISE(ABORT, 'Time entries are immutable'); END;

--> statement-breakpoint

CREATE TRIGGER intervention_time_immutable_delete BEFORE DELETE ON intervention_time_entries BEGIN SELECT RAISE(ABORT, 'Time entries are immutable'); END;

--> statement-breakpoint

CREATE TRIGGER subscription_observation_created AFTER INSERT ON subscriptions BEGIN INSERT INTO subscription_observations(subscription_id,status,amount_cents,billing_interval,current_period_start,current_period_end,cancel_requested_at,cancel_effective_at,review_required,stripe_event_created) VALUES(NEW.id,NEW.status,NEW.amount_cents,NEW.billing_interval,NEW.current_period_start,NEW.current_period_end,NEW.cancel_requested_at,NEW.cancel_effective_at,NEW.entitlement_review_required,NEW.last_event_created); END;

--> statement-breakpoint

CREATE TRIGGER subscription_observation_changed AFTER UPDATE ON subscriptions WHEN NEW.status IS NOT OLD.status OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.billing_interval IS NOT OLD.billing_interval OR NEW.current_period_start IS NOT OLD.current_period_start OR NEW.current_period_end IS NOT OLD.current_period_end OR NEW.cancel_requested_at IS NOT OLD.cancel_requested_at OR NEW.cancel_effective_at IS NOT OLD.cancel_effective_at OR NEW.entitlement_review_required IS NOT OLD.entitlement_review_required OR NEW.last_event_created IS NOT OLD.last_event_created BEGIN INSERT INTO subscription_observations(subscription_id,status,amount_cents,billing_interval,current_period_start,current_period_end,cancel_requested_at,cancel_effective_at,review_required,stripe_event_created) VALUES(NEW.id,NEW.status,NEW.amount_cents,NEW.billing_interval,NEW.current_period_start,NEW.current_period_end,NEW.cancel_requested_at,NEW.cancel_effective_at,NEW.entitlement_review_required,NEW.last_event_created); END;

--> statement-breakpoint

CREATE TRIGGER subscription_observations_immutable_update BEFORE UPDATE ON subscription_observations BEGIN SELECT RAISE(ABORT, 'Subscription observations are immutable'); END;

--> statement-breakpoint

CREATE TRIGGER subscription_observations_immutable_delete BEFORE DELETE ON subscription_observations BEGIN SELECT RAISE(ABORT, 'Subscription observations are immutable'); END;
