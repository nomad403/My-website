ALTER TABLE intervention_requests ADD COLUMN internal_priority text NOT NULL DEFAULT 'normal'
 CHECK (internal_priority IN ('low','normal','high','urgent'));
ALTER TABLE intervention_events DROP CONSTRAINT IF EXISTS intervention_events_kind_check;
ALTER TABLE intervention_events ADD CONSTRAINT intervention_events_kind_check CHECK (kind IN ('created','message','status','time','priority'));
ALTER TABLE refunds ADD COLUMN succeeded_event_at timestamptz;
CREATE INDEX admin_users_created_idx ON users(created_at, id);
CREATE INDEX admin_invoices_issued_idx ON invoices(issued_at, id);
CREATE INDEX admin_payments_paid_idx ON payments(paid_at, id);
CREATE INDEX admin_refunds_success_idx ON refunds(succeeded_event_at, id);
CREATE INDEX admin_interventions_status_idx ON intervention_requests(status, created_at, id);
CREATE TABLE subscription_observations (
 id bigserial PRIMARY KEY,
 subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 status text NOT NULL,
 amount_cents integer NOT NULL,
 billing_interval text NOT NULL,
 current_period_start timestamptz,
 current_period_end timestamptz,
 cancel_requested_at timestamptz,
 cancel_effective_at timestamptz,
 review_required boolean NOT NULL,
 stripe_event_created bigint NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscription_observations_sub_idx ON subscription_observations(subscription_id, id);
CREATE FUNCTION record_subscription_observation() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
 IF TG_OP = 'INSERT' OR ROW(NEW.status,NEW.amount_cents,NEW.billing_interval,NEW.current_period_start,NEW.current_period_end,NEW.cancel_requested_at,NEW.cancel_effective_at,NEW.entitlement_review_required,NEW.last_event_created)
 IS DISTINCT FROM ROW(OLD.status,OLD.amount_cents,OLD.billing_interval,OLD.current_period_start,OLD.current_period_end,OLD.cancel_requested_at,OLD.cancel_effective_at,OLD.entitlement_review_required,OLD.last_event_created) THEN
 INSERT INTO subscription_observations(subscription_id,status,amount_cents,billing_interval,current_period_start,current_period_end,cancel_requested_at,cancel_effective_at,review_required,stripe_event_created)
 VALUES(NEW.id,NEW.status,NEW.amount_cents,NEW.billing_interval,NEW.current_period_start,NEW.current_period_end,NEW.cancel_requested_at,NEW.cancel_effective_at,NEW.entitlement_review_required,NEW.last_event_created);
 END IF;
 RETURN NEW;
END;
$body$;
CREATE TRIGGER subscription_observation AFTER INSERT OR UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION record_subscription_observation();
CREATE FUNCTION protect_subscription_observation() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
 RAISE EXCEPTION 'Subscription observations are immutable';
END;
$body$;
CREATE TRIGGER subscription_observations_immutable BEFORE UPDATE OR DELETE ON subscription_observations FOR EACH ROW EXECUTE FUNCTION protect_subscription_observation();

CREATE TABLE billing_sync_lock(id integer PRIMARY KEY CHECK(id=1));
INSERT INTO billing_sync_lock(id) VALUES(1);

ALTER TABLE invoices ADD COLUMN total_cents integer;
