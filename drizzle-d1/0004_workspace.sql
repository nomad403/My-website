-- Search keys are maintained with Unicode lowercase by the application. Import tools must do the same.
ALTER TABLE customer_profiles ADD COLUMN search_first_name TEXT NOT NULL DEFAULT '';

--> statement-breakpoint

ALTER TABLE customer_profiles ADD COLUMN search_last_name TEXT NOT NULL DEFAULT '';

--> statement-breakpoint

UPDATE customer_profiles SET search_first_name=lower(first_name),search_last_name=lower(last_name);

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_projects_insert AFTER INSERT ON projects BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_projects_update AFTER UPDATE ON projects BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_projects_delete AFTER DELETE ON projects BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_requests_insert AFTER INSERT ON intervention_requests BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_requests_update AFTER UPDATE ON intervention_requests BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_requests_delete AFTER DELETE ON intervention_requests BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_events_insert AFTER INSERT ON intervention_events BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_events_update AFTER UPDATE ON intervention_events BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_events_delete AFTER DELETE ON intervention_events BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_periods_insert AFTER INSERT ON intervention_periods BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_periods_update AFTER UPDATE ON intervention_periods BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_periods_delete AFTER DELETE ON intervention_periods BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_time_entries_insert AFTER INSERT ON intervention_time_entries BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_time_entries_update AFTER UPDATE ON intervention_time_entries BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_time_entries_delete AFTER DELETE ON intervention_time_entries BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_outbox_insert AFTER INSERT ON intervention_outbox BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_outbox_update AFTER UPDATE ON intervention_outbox BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_intervention_outbox_delete AFTER DELETE ON intervention_outbox BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_audit_logs_insert AFTER INSERT ON audit_logs BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_audit_logs_update AFTER UPDATE ON audit_logs BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;

--> statement-breakpoint

CREATE TRIGGER d1_billing_revision_audit_logs_delete AFTER DELETE ON audit_logs BEGIN UPDATE d1_billing_revision SET revision=revision+1 WHERE id=1; END;
