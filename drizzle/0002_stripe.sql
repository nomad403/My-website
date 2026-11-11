-- Stripe test : codes privés, sessions Checkout, idempotence des webhooks.
-- Le prix copié sur un abonnement n'est pas réécrit par un événement plus récent.

ALTER TABLE subscriptions ADD COLUMN last_event_created bigint NOT NULL DEFAULT 0;

ALTER TABLE invoices ADD COLUMN last_event_created bigint NOT NULL DEFAULT 0;

ALTER TABLE payments ADD COLUMN last_event_created bigint NOT NULL DEFAULT 0;

ALTER TABLE refunds ADD COLUMN last_event_created bigint NOT NULL DEFAULT 0;

CREATE TABLE promotion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  plan_code text NOT NULL REFERENCES plans (code),
  expires_at timestamptz,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  restricted_email text,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotion_codes_private_plan CHECK (plan_code IN ('friend_host', 'friend_care')),
  CONSTRAINT promotion_codes_max_positive CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  CONSTRAINT promotion_codes_count_nonnegative CHECK (redemption_count >= 0)
);

CREATE TABLE promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_code_id uuid NOT NULL REFERENCES promotion_codes (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotion_redemptions_status CHECK (status IN ('reserved', 'consumed', 'released'))
);

CREATE INDEX promotion_redemptions_code_idx ON promotion_redemptions (promotion_code_id);

CREATE TABLE checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE,
  url text,
  plan_code text NOT NULL,
  billing_interval billing_interval NOT NULL,
  amount_cents integer NOT NULL,
  redemption_id uuid,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkout_sessions_status CHECK (status IN ('open', 'complete', 'expired', 'failed')),
  CONSTRAINT checkout_sessions_amount_positive CHECK (amount_cents > 0)
);

CREATE INDEX checkout_sessions_user_idx ON checkout_sessions (user_id);

CREATE UNIQUE INDEX checkout_sessions_one_open_idx
  ON checkout_sessions (user_id, plan_code, billing_interval)
  WHERE status = 'open';

CREATE TABLE stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
