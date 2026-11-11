-- Additive client workspace and intervention ledger; no historical prices are rewritten.
ALTER TABLE subscriptions ADD COLUMN service_anchor_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN entitlement_review_required boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN service_period_start timestamptz;
ALTER TABLE invoices ADD COLUMN service_period_end timestamptz;
ALTER TABLE invoices ADD COLUMN service_subscription_id text;
CREATE UNIQUE INDEX projects_id_owner_idx ON projects(id, user_id);
CREATE UNIQUE INDEX subscriptions_id_owner_idx ON subscriptions(id, user_id);

CREATE TABLE intervention_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 project_id uuid NOT NULL,
 subscription_id uuid,
 submission_key uuid NOT NULL,
 payload_hash text NOT NULL,
 subject text NOT NULL CHECK (length(subject) BETWEEN 3 AND 160),
 description text NOT NULL CHECK (length(description) BETWEEN 10 AND 4000),
 category text NOT NULL CHECK (category IN ('minor_fix','content','visual','maintenance','incident','other')),
 urgency text NOT NULL CHECK (urgency IN ('low','normal','high')),
 additional_info text NOT NULL DEFAULT '' CHECK (length(additional_info) <= 2000),
 status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','analyzing','accepted','in_progress','waiting_client','completed','rejected','cancelled')),
 minor_scope_confirmed boolean NOT NULL DEFAULT false,
 coverage text NOT NULL DEFAULT 'unreviewed' CHECK (coverage IN ('unreviewed','included','outside')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, submission_key),
 FOREIGN KEY(project_id, user_id) REFERENCES projects(id, user_id) ON DELETE RESTRICT,
 FOREIGN KEY(subscription_id, user_id) REFERENCES subscriptions(id, user_id) ON DELETE RESTRICT
);
CREATE INDEX intervention_requests_owner_idx ON intervention_requests(user_id, created_at);
CREATE TABLE intervention_events (
 sequence bigserial NOT NULL,
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES intervention_requests(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 actor_role text NOT NULL CHECK (actor_role IN ('client','admin')),
 kind text NOT NULL CHECK (kind IN ('created','message','status','time')),
 internal boolean NOT NULL DEFAULT false,
 body text NOT NULL DEFAULT '' CHECK (length(body) <= 4000),
 from_status text,
 to_status text,
 operation_key uuid NOT NULL,
 payload_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(request_id, actor_id, operation_key)
);
CREATE INDEX intervention_events_request_idx ON intervention_events(request_id, created_at);
CREATE TABLE intervention_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 period_start timestamptz NOT NULL,
 period_end timestamptz NOT NULL,
 included_minutes integer NOT NULL DEFAULT 60 CHECK (included_minutes = 60),
 consumed_minutes integer NOT NULL DEFAULT 0 CHECK (consumed_minutes BETWEEN 0 AND included_minutes),
 CHECK (period_end > period_start),
 UNIQUE(subscription_id, period_start)
);
CREATE TABLE intervention_time_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE REFERENCES intervention_requests(id) ON DELETE RESTRICT,
 subscription_id uuid REFERENCES subscriptions(id) ON DELETE RESTRICT,
 period_id uuid REFERENCES intervention_periods(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
 coverage text NOT NULL CHECK (coverage IN ('included','outside')),
 performed_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((coverage = 'included' AND period_id IS NOT NULL AND subscription_id IS NOT NULL AND minutes <= 60)
     OR (coverage = 'outside' AND period_id IS NULL))
);
CREATE TABLE intervention_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL UNIQUE REFERENCES intervention_events(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 audience text NOT NULL CHECK (audience IN ('client','admin')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION protect_intervention_time() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
 RAISE EXCEPTION 'Time entries are immutable';
END;
$body$;
CREATE TRIGGER intervention_time_immutable BEFORE UPDATE OR DELETE ON intervention_time_entries
 FOR EACH ROW EXECUTE FUNCTION protect_intervention_time();
