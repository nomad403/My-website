-- Nomad403 : comptes, sessions, projets, abonnements et facturation.
-- Appliquée une seule fois par npm run db:migrate.
-- Le prix d'un abonnement est copié dans amount_cents et n'est pas recalculé depuis plans.

CREATE TYPE user_role AS ENUM ('client', 'admin');

CREATE TYPE plan_visibility AS ENUM ('public', 'private');

CREATE TYPE billing_interval AS ENUM ('month', 'year');

CREATE TYPE subscription_status AS ENUM (
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled'
);

CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');

CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'canceled');

CREATE TYPE refund_status AS ENUM ('pending', 'succeeded', 'failed', 'canceled');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  disabled_at timestamptz
);

CREATE TABLE customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  company text,
  billing_email text NOT NULL,
  locale text NOT NULL DEFAULT 'fr',
  stripe_customer_id text UNIQUE,
  cgv_version text,
  cgv_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_user_id_idx ON projects (user_id);

CREATE TABLE plans (
  code text PRIMARY KEY,
  visibility plan_visibility NOT NULL,
  monthly_amount_cents integer NOT NULL,
  yearly_amount_cents integer,
  currency text NOT NULL DEFAULT 'EUR',
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT plans_monthly_positive CHECK (monthly_amount_cents > 0),
  CONSTRAINT plans_yearly_positive CHECK (yearly_amount_cents IS NULL OR yearly_amount_cents > 0),
  CONSTRAINT plans_currency_eur CHECK (currency = 'EUR')
);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects (id) ON DELETE SET NULL,
  plan_code text NOT NULL REFERENCES plans (code),
  status subscription_status NOT NULL DEFAULT 'incomplete',
  billing_interval billing_interval NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  private_offer boolean NOT NULL DEFAULT false,
  commercial_terms text NOT NULL DEFAULT 'catalog-v1',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_requested_at timestamptz,
  cancel_effective_at timestamptz,
  stripe_subscription_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT subscriptions_currency_eur CHECK (currency = 'EUR')
);

COMMENT ON COLUMN subscriptions.amount_cents IS
  'Prix figé pour la vie de cet abonnement. Une évolution du catalogue ne réécrit pas cette valeur.';

CREATE INDEX subscriptions_user_id_idx ON subscriptions (user_id);

CREATE INDEX subscriptions_status_idx ON subscriptions (status);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES subscriptions (id) ON DELETE SET NULL,
  stripe_invoice_id text UNIQUE,
  status invoice_status NOT NULL,
  amount_due_cents integer NOT NULL,
  amount_paid_cents integer NOT NULL,
  amount_remaining_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_due_nonnegative CHECK (amount_due_cents >= 0),
  CONSTRAINT invoices_paid_nonnegative CHECK (amount_paid_cents >= 0),
  CONSTRAINT invoices_remaining_nonnegative CHECK (amount_remaining_cents >= 0),
  CONSTRAINT invoices_currency_eur CHECK (currency = 'EUR')
);

CREATE INDEX invoices_user_id_idx ON invoices (user_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES invoices (id) ON DELETE SET NULL,
  stripe_payment_intent_id text UNIQUE,
  status payment_status NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  failure_code text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT payments_currency_eur CHECK (currency = 'EUR')
);

CREATE INDEX payments_user_id_idx ON payments (user_id);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  stripe_refund_id text UNIQUE,
  status refund_status NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refunds_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT refunds_currency_eur CHECK (currency = 'EUR')
);

CREATE INDEX refunds_payment_id_idx ON refunds (payment_id);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  secret_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  mfa_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX magic_links_email_idx ON magic_links (email);

CREATE TABLE admin_totp (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  secret_ciphertext text NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  CONSTRAINT recovery_codes_user_hash_unique UNIQUE (user_id, code_hash)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id);

CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);

INSERT INTO plans (code, visibility, monthly_amount_cents, yearly_amount_cents, currency, active)
VALUES
  ('essential', 'public', 1900, 19000, 'EUR', true),
  ('plus', 'public', 4900, 49000, 'EUR', true),
  ('premium', 'public', 6900, 69000, 'EUR', true),
  ('friend_host', 'private', 1000, NULL, 'EUR', true),
  ('friend_care', 'private', 2000, NULL, 'EUR', true)
ON CONFLICT (code) DO UPDATE SET
  visibility = EXCLUDED.visibility,
  monthly_amount_cents = EXCLUDED.monthly_amount_cents,
  yearly_amount_cents = EXCLUDED.yearly_amount_cents,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active;
