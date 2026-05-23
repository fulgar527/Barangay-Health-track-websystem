-- HealthTrack Database Migration: v1 → v2
-- Run this if you already have an existing database from the original schema.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).

-- ── 1. Extend queue.status to include Accepted and Rejected ──────────────────
ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_status_check;
ALTER TABLE queue ADD CONSTRAINT queue_status_check
  CHECK (status IN ('Waiting', 'In Progress', 'Accepted', 'Completed', 'Cancelled', 'Rejected'));

-- ── 2. Add new columns to queue ──────────────────────────────────────────────
ALTER TABLE queue
  ADD COLUMN IF NOT EXISTS booked_by_username VARCHAR(50) REFERENCES users(username) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

-- ── 3. Rebuild the queue_with_patient_details VIEW ───────────────────────────
CREATE OR REPLACE VIEW queue_with_patient_details AS
SELECT
    q.queue_id,
    q.queue_number,
    q.patient_id,
    p.first_name,
    p.last_name,
    p.middle_name,
    p.age,
    p.sex,
    q.service_category,
    q.service_name,
    q.priority,
    q.chief_complaint,
    q.appointment_date,
    q.appointment_time,
    q.status,
    q.time_queued,
    q.time_started,
    q.time_completed,
    q.self_booked,
    q.booked_by_username,
    q.rejected_reason,
    q.rejected_at,
    q.created_at
FROM queue q
JOIN patients p ON q.patient_id = p.patient_id;

DO $$
BEGIN
    RAISE NOTICE 'Migration v2 applied successfully.';
    RAISE NOTICE 'queue: status CHECK updated, booked_by_username / rejected_reason / rejected_at added.';
    RAISE NOTICE 'VIEW queue_with_patient_details rebuilt.';
END $$;

-- ── Migration v2 additions (run if upgrading from v1) ─────────────────────────

-- audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    log_id       SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action       VARCHAR(60)  NOT NULL,
    target_table VARCHAR(50),
    target_id    VARCHAR(50),
    details      JSONB,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Extended visit_log fields
ALTER TABLE visit_log
  ADD COLUMN IF NOT EXISTS civil_status              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS occupation                VARCHAR(100),
  ADD COLUMN IF NOT EXISTS philhealth_number         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS emergency_contact_person  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS emergency_contact_number  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS allergies                 TEXT,
  ADD COLUMN IF NOT EXISTS chronic_conditions        TEXT,
  ADD COLUMN IF NOT EXISTS current_medications       TEXT;

DO $$
BEGIN
    RAISE NOTICE 'Migration v2 (security additions) applied.';
    RAISE NOTICE 'audit_log table created, visit_log extended with patient snapshot fields.';
END $$;
