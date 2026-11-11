-- Extend existing promotions without rewriting contractual subscription prices.
ALTER TABLE promotion_codes ADD COLUMN code_hint text;
ALTER TABLE promotion_codes ADD COLUMN usage_terms text NOT NULL DEFAULT 'catalog-v1';
ALTER TABLE promotion_codes ADD COLUMN internal_notes text NOT NULL DEFAULT '';
ALTER TABLE promotion_codes ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE promotion_codes ADD COLUMN changed_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN promotion_redemption_id uuid REFERENCES promotion_redemptions(id) ON DELETE RESTRICT;
CREATE INDEX subscriptions_promotion_redemption_idx ON subscriptions(promotion_redemption_id);
CREATE UNIQUE INDEX promotion_redemptions_one_reserved_idx ON promotion_redemptions(promotion_code_id, user_id) WHERE status = 'reserved';
CREATE INDEX audit_logs_promotion_idx ON audit_logs ((metadata->>'promotionId'), created_at);

CREATE FUNCTION protect_promotion_terms() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF ROW(NEW.code_hash, NEW.plan_code, NEW.expires_at, NEW.max_redemptions, NEW.restricted_email, NEW.usage_terms, NEW.code_hint, NEW.created_at)
     IS DISTINCT FROM ROW(OLD.code_hash, OLD.plan_code, OLD.expires_at, OLD.max_redemptions, OLD.restricted_email, OLD.usage_terms, OLD.code_hint, OLD.created_at) THEN
    RAISE EXCEPTION 'Promotion terms are immutable';
  END IF;
  IF OLD.disabled_at IS NOT NULL AND NEW.disabled_at IS DISTINCT FROM OLD.disabled_at THEN
    RAISE EXCEPTION 'A disabled promotion cannot be reactivated';
  END IF;
  RETURN NEW;
END;
$body$;
CREATE TRIGGER promotion_terms_immutable BEFORE UPDATE ON promotion_codes FOR EACH ROW EXECUTE FUNCTION protect_promotion_terms();

CREATE FUNCTION audit_promotion_change() RETURNS trigger LANGUAGE plpgsql AS $body$
DECLARE event_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN event_action := 'promotion.created';
    INSERT INTO audit_logs(actor_user_id, action, metadata)
    VALUES (NEW.changed_by, event_action, jsonb_build_object('promotionId', NEW.id::text));
    RETURN NEW;
  END IF;
  IF NEW.disabled_at IS DISTINCT FROM OLD.disabled_at THEN
    INSERT INTO audit_logs(actor_user_id, action, metadata)
    VALUES (NEW.changed_by, 'promotion.disabled', jsonb_build_object('promotionId', NEW.id::text));
  END IF;
  IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes THEN
    INSERT INTO audit_logs(actor_user_id, action, metadata)
    VALUES (NEW.changed_by, 'promotion.notes_updated', jsonb_build_object('promotionId', NEW.id::text));
  END IF;
  RETURN NEW;
END;
$body$;
CREATE TRIGGER promotion_admin_audit AFTER INSERT OR UPDATE ON promotion_codes FOR EACH ROW EXECUTE FUNCTION audit_promotion_change();

CREATE FUNCTION audit_promotion_redemption() RETURNS trigger LANGUAGE plpgsql AS $body$
DECLARE event_action text;
BEGIN
  IF TG_OP = 'UPDATE' AND (ROW(NEW.promotion_code_id, NEW.user_id, NEW.created_at) IS DISTINCT FROM ROW(OLD.promotion_code_id, OLD.user_id, OLD.created_at)) THEN
    RAISE EXCEPTION 'Redemption ownership is immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status <> 'reserved' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'A final redemption cannot change';
  END IF;
  IF TG_OP = 'INSERT' THEN event_action := 'promotion.reserved';
  ELSIF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW;
  ELSIF NEW.status = 'consumed' THEN event_action := 'promotion.consumed';
  ELSIF NEW.status = 'released' THEN event_action := 'promotion.released';
  ELSE RAISE EXCEPTION 'Invalid redemption transition';
  END IF;
  INSERT INTO audit_logs(actor_user_id, action, metadata)
  VALUES (CASE WHEN TG_OP = 'INSERT' THEN NEW.user_id ELSE NULL END, event_action,
    jsonb_build_object('promotionId', NEW.promotion_code_id::text, 'redemptionId', NEW.id::text, 'userId', NEW.user_id::text));
  RETURN NEW;
END;
$body$;
CREATE TRIGGER promotion_redemption_audit AFTER INSERT OR UPDATE ON promotion_redemptions FOR EACH ROW EXECUTE FUNCTION audit_promotion_redemption();
