-- HealthTrack PostgreSQL Seed Data (Supabase Auth Edition)
-- Version: 2.1
-- SYSTEM DATA ONLY — required service categories and clinic services.
-- DO NOT DELETE: These entries are required for the system to function.
-- This file is idempotent — safe to re-run (ON CONFLICT DO NOTHING everywhere).
--
-- ⚠️  Do NOT add patient, queue, or visit log data here.
--     All patient data must be entered through the application.
--
-- Changes in 2.1:
--   * Removed INSERT INTO users (...) — there is no app-level users table.
--     Authentication is handled by Supabase Auth (auth.users). See note below.
--   * Rewrote the services INSERT to match the real schema:
--       OLD (wrong): services(service_name, category, default_priority, is_active)
--       NEW (correct): services(category_id, service_name, priority)
--     category_id is resolved from service_categories by name, and the conflict
--     target now matches the table's UNIQUE(category_id, service_name) constraint.
--   * Added service_categories seeding so this file is self-sufficient.

-- =============================================================================
-- SYSTEM ACCOUNTS — handled by Supabase Auth, NOT seeded via SQL
-- =============================================================================
-- User accounts are managed entirely by Supabase Auth (auth.users). Create the
-- default accounts through the Supabase dashboard or the Auth Admin API, and
-- store role/username in user_metadata, for example:
--
--   admin    -> { "username": "admin",    "role": "admin",    "full_name": "System Administrator" }
--   staff    -> { "username": "staff",    "role": "staff",    "full_name": "Health Staff" }
--   resident -> { "username": "resident", "role": "resident", "full_name": "Resident User" }
--
-- ⚠️  Set strong passwords and change them after first login in production.

-- =============================================================================
-- REQUIRED SERVICE CATEGORIES
-- Seeded here as well so the services INSERT below can resolve category_id.
-- Safe to re-run — ON CONFLICT skips categories that already exist.
-- =============================================================================

INSERT INTO service_categories (category_name, urgency, description)
VALUES
  ('Maternal Care',                               'Non-Urgent', 'Prenatal, postnatal, and maternal health services'),
  ('Child Health Services',                       'Non-Urgent', 'Pediatric care, immunization, and growth monitoring'),
  ('Family Planning',                             'Non-Urgent', 'Family planning counseling and contraceptive services'),
  ('Basic Medical Services',                      'Mixed',      'General medical consultations and treatments'),
  ('Nutrition Programs',                          'Non-Urgent', 'Nutrition counseling and supplementation programs'),
  ('Communicable Disease Control',                'Urgent',     'Disease screening, monitoring, and prevention'),
  ('Health Education & Counseling',               'Non-Urgent', 'Health education and counseling services'),
  ('Environmental Health & Sanitation Services',  'Non-Urgent', 'Environmental health and sanitation programs'),
  ('Senior Citizen Health Services',              'Non-Urgent', 'Health services for senior citizens'),
  ('Administrative & Health Records Services',    'Non-Urgent', 'Administrative and documentation services')
ON CONFLICT (category_name) DO NOTHING;

-- =============================================================================
-- REQUIRED SERVICES CONFIGURATION
-- These are the clinic services available for queue and booking.
-- Must match SERVICE_CATEGORIES defined in frontend/app.js exactly.
-- category_id is looked up from service_categories by name.
-- =============================================================================

INSERT INTO services (category_id, service_name, priority)
SELECT sc.category_id, v.service_name, v.priority
FROM (
  VALUES
    -- Maternal Care
    ('Maternal Care', 'Prenatal check-up',                                          'Regular'),
    ('Maternal Care', 'Postnatal care',                                             'Regular'),
    ('Maternal Care', 'Safe motherhood education',                                  'Regular'),

    -- Child Health Services
    ('Child Health Services', 'Newborn check-up',                                   'Regular'),
    ('Child Health Services', 'Immunization/vaccination programs',                  'Regular'),
    ('Child Health Services', 'Growth monitoring (weighing, height measurement)',   'Regular'),

    -- Family Planning
    ('Family Planning', 'Counseling sessions',                                      'Regular'),
    ('Family Planning', 'Distribution of contraceptives (pills, condoms, injectables)', 'Regular'),
    ('Family Planning', 'Natural family planning guidance',                         'Regular'),

    -- Basic Medical Services
    ('Basic Medical Services', 'First aid treatment for minor injuries',            'Urgent'),
    ('Basic Medical Services', 'Consultation for common illnesses (fever, cough, colds, diarrhea)', 'Regular'),
    ('Basic Medical Services', 'Vital signs monitoring (BP, temperature, weight)',  'Regular'),
    ('Basic Medical Services', 'Referral to hospitals for advanced care',           'Priority Case'),

    -- Nutrition Programs
    ('Nutrition Programs', 'Operation Timbang (child weighing)',                    'Regular'),
    ('Nutrition Programs', 'Nutrition and diet counseling',                         'Regular'),
    ('Nutrition Programs', 'Vitamin supplementation (Vit. A, Iron, etc.)',          'Regular'),

    -- Communicable Disease Control
    ('Communicable Disease Control', 'Tuberculosis (TB) screening and referral',    'Urgent'),
    ('Communicable Disease Control', 'Dengue monitoring and awareness campaigns',   'Urgent'),
    ('Communicable Disease Control', 'COVID-19 monitoring',                         'Urgent'),
    ('Communicable Disease Control', 'Rabies prevention information',               'Urgent'),

    -- Health Education & Counseling
    ('Health Education & Counseling', 'Hygiene and sanitation education',           'Regular'),
    ('Health Education & Counseling', 'Adolescent health counseling',               'Regular'),
    ('Health Education & Counseling', 'Awareness programs for diabetes, hypertension, etc.', 'Regular'),

    -- Environmental Health & Sanitation Services
    ('Environmental Health & Sanitation Services', 'Water sanitation and safety awareness', 'Regular'),
    ('Environmental Health & Sanitation Services', 'Waste disposal education',      'Regular'),
    ('Environmental Health & Sanitation Services', 'Community health surveillance', 'Regular'),

    -- Senior Citizen Health Services
    ('Senior Citizen Health Services', 'Blood pressure check',                      'Regular'),
    ('Senior Citizen Health Services', 'Basic medical consultation',                'Regular'),
    ('Senior Citizen Health Services', 'Maintenance medicine distribution',         'Regular'),

    -- Administrative & Health Records Services
    ('Administrative & Health Records Services', 'Updating barangay health records', 'Regular'),
    ('Administrative & Health Records Services', 'Health referrals and documents',  'Regular'),
    ('Administrative & Health Records Services', 'Assistance with health certificates', 'Regular')
) AS v(category_name, service_name, priority)
JOIN service_categories sc ON sc.category_name = v.category_name
ON CONFLICT (category_id, service_name) DO NOTHING;
-- ON CONFLICT: safe to re-run — will not duplicate existing services

-- =============================================================================
-- VERIFICATION
-- Confirms seed data was applied correctly.
-- =============================================================================

DO $$
DECLARE
  category_count INTEGER;
  service_count  INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_count FROM service_categories;
  SELECT COUNT(*) INTO service_count  FROM services;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'HealthTrack Seed Data Applied';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Service categories : %', category_count;
  RAISE NOTICE 'Clinic services    : %', service_count;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'User accounts are managed in Supabase Auth.';
  RAISE NOTICE 'Create admin / staff / resident via the dashboard';
  RAISE NOTICE 'and set username/role in user_metadata.';
  RAISE NOTICE '==========================================';
END $$;
