-- Invalidate staged billing decisions on ALL writes to their dependencies, including raw SQL and auth writes.
-- Optimistic checks and business writes commit in one batch; no transaction is held during Stripe GETs.
CREATE TABLE d1_billing_revision(id INTEGER NOT NULL PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL CHECK(revision BETWEEN 0 AND 9007199254740991)) STRICT;

--> statement-breakpoint

INSERT INTO d1_billing_revision(id,revision) VALUES(1,0);

--> statement-breakpoint

CREATE TABLE d1_billing_guard(id INTEGER NOT NULL PRIMARY KEY CHECK(id=1),ok INTEGER NOT NULL,CONSTRAINT billing_snapshot_current CHECK(ok=1)) STRICT;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_users_insert AFTER INSERT ON users BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_users_update AFTER UPDATE ON users BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_users_delete AFTER DELETE ON users BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_customer_profiles_insert AFTER INSERT ON customer_profiles BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_customer_profiles_update AFTER UPDATE ON customer_profiles BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_customer_profiles_delete AFTER DELETE ON customer_profiles BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_plans_insert AFTER INSERT ON plans BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_plans_update AFTER UPDATE ON plans BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_plans_delete AFTER DELETE ON plans BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_promotion_codes_insert AFTER INSERT ON promotion_codes BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_promotion_codes_update AFTER UPDATE ON promotion_codes BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_promotion_codes_delete AFTER DELETE ON promotion_codes BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_promotion_redemptions_insert AFTER INSERT ON promotion_redemptions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_promotion_redemptions_update AFTER UPDATE ON promotion_redemptions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_promotion_redemptions_delete AFTER DELETE ON promotion_redemptions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_checkout_sessions_insert AFTER INSERT ON checkout_sessions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_checkout_sessions_update AFTER UPDATE ON checkout_sessions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_checkout_sessions_delete AFTER DELETE ON checkout_sessions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_subscriptions_insert AFTER INSERT ON subscriptions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_subscriptions_update AFTER UPDATE ON subscriptions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_subscriptions_delete AFTER DELETE ON subscriptions BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_invoices_insert AFTER INSERT ON invoices BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_invoices_update AFTER UPDATE ON invoices BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_invoices_delete AFTER DELETE ON invoices BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_payments_insert AFTER INSERT ON payments BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_payments_update AFTER UPDATE ON payments BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_payments_delete AFTER DELETE ON payments BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_refunds_insert AFTER INSERT ON refunds BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_refunds_update AFTER UPDATE ON refunds BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_refunds_delete AFTER DELETE ON refunds BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_stripe_events_insert AFTER INSERT ON stripe_events BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_stripe_events_update AFTER UPDATE ON stripe_events BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_stripe_events_delete AFTER DELETE ON stripe_events BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;
