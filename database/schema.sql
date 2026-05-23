-- HealthTrack PostgreSQL Database Schema (Supabase Auth Edition)
-- Version: 2.1
-- Description: Complete database schema for HealthTrack Patient Information System
-- Authentication: Handled by Supabase Auth (auth.users table)
--
-- Changes in 2.1:
--   * Removed INSERT INTO users (...) block - no app-level users table exists;
--     Supabase auth.users handles authentication and stores username/role in
--     user_metadata.
--   * Fixed audit_log index: idx_audit_log_user_id -> idx_audit_log_username
--     (the audit_log table has a username column, not user_id).
--   * Updated final success message to reflect Supabase Auth setup.

-- Drop existing tables if they exist (for fresh installation)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS visit_log CASCADE;
DROP TABLE IF EXISTS queue CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- NOTE: No users table needed - Supabase auth.users handles authentication
-- User metadata (username, role) stored in auth.users.user_metadata

-- ==================== SERVICE CATEGORIES TABLE ====================
CREATE TABLE service_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('Urgent', 'Non-Urgent', 'Mixed')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== SERVICES TABLE ====================
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(category_id) ON DELETE CASCADE,
    service_name VARCHAR(200) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Priority Case', 'Urgent', 'Regular')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, service_name)
);

-- ==================== PATIENTS TABLE ====================
CREATE TABLE patients (
    patient_id VARCHAR(20) PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    date_of_birth DATE NOT NULL,
    age INTEGER NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('Male', 'Female')),
    address TEXT NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    civil_status VARCHAR(20),
    occupation VARCHAR(100),
    philhealth_number VARCHAR(20),
    emergency_contact_person VARCHAR(100),
    emergency_contact_number VARCHAR(20),
    allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== QUEUE TABLE ====================
CREATE TABLE queue (
    queue_id SERIAL PRIMARY KEY,
    queue_number INTEGER NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(service_id),
    service_category VARCHAR(100) NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Priority Case', 'Urgent', 'Regular')),
    chief_complaint TEXT NOT NULL,
    appointment_date DATE,
    appointment_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'In Progress', 'Accepted', 'Completed', 'Cancelled', 'Rejected')),
    time_queued TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_started TIMESTAMP,
    time_completed TIMESTAMP,
    self_booked BOOLEAN DEFAULT FALSE,
    booked_by_username VARCHAR(50),  -- Stores username from Supabase auth.users.user_metadata
    rejected_reason TEXT,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== VISIT LOG TABLE ====================
CREATE TABLE visit_log (
    visit_id SERIAL PRIMARY KEY,
    patient_id VARCHAR(20) REFERENCES patients(patient_id) ON DELETE CASCADE,
    queue_id INTEGER REFERENCES queue(queue_id),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_category VARCHAR(100) NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    chief_complaint TEXT NOT NULL,
    civil_status VARCHAR(20),
    occupation VARCHAR(100),
    philhealth_number VARCHAR(20),
    emergency_contact_person VARCHAR(100),
    emergency_contact_number VARCHAR(20),
    allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    vital_signs JSONB,
    notes TEXT,
    time_queued TIMESTAMP,
    time_served TIMESTAMP,
    attended_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== AUDIT LOG TABLE ====================
CREATE TABLE audit_log (
    log_id       SERIAL PRIMARY KEY,
    username     VARCHAR(100),  -- Stores username from Supabase auth.users.user_metadata
    action       VARCHAR(60)  NOT NULL,
    target_table VARCHAR(50),
    target_id    VARCHAR(50),
    details      JSONB,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INDEXES ====================
-- Patients
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_patients_registration_date ON patients(registration_date);

-- Queue
CREATE INDEX idx_queue_status ON queue(status);
CREATE INDEX idx_queue_priority ON queue(priority);
CREATE INDEX idx_queue_appointment_date ON queue(appointment_date);
CREATE INDEX idx_queue_patient_id ON queue(patient_id);
CREATE INDEX idx_queue_created_at ON queue(created_at);

-- Visit Log
CREATE INDEX idx_visit_log_patient_id ON visit_log(patient_id);
CREATE INDEX idx_visit_log_visit_date ON visit_log(visit_date);
CREATE INDEX idx_visit_log_service_category ON visit_log(service_category);

-- Audit Log
CREATE INDEX idx_audit_log_username   ON audit_log(username);
CREATE INDEX idx_audit_log_action     ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ==================== FUNCTIONS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_updated_at BEFORE UPDATE ON queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visit_log_updated_at BEFORE UPDATE ON visit_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== INITIAL DATA ====================

-- Insert Service Categories
INSERT INTO service_categories (category_name, urgency, description) VALUES
('Maternal Care', 'Non-Urgent', 'Prenatal, postnatal, and maternal health services'),
('Child Health Services', 'Non-Urgent', 'Pediatric care, immunization, and growth monitoring'),
('Family Planning', 'Non-Urgent', 'Family planning counseling and contraceptive services'),
('Basic Medical Services', 'Mixed', 'General medical consultations and treatments'),
('Nutrition Programs', 'Non-Urgent', 'Nutrition counseling and supplementation programs'),
('Communicable Disease Control', 'Urgent', 'Disease screening, monitoring, and prevention'),
('Health Education & Counseling', 'Non-Urgent', 'Health education and counseling services'),
('Environmental Health & Sanitation Services', 'Non-Urgent', 'Environmental health and sanitation programs'),
('Senior Citizen Health Services', 'Non-Urgent', 'Health services for senior citizens'),
('Administrative & Health Records Services', 'Non-Urgent', 'Administrative and documentation services');

-- Insert Services
INSERT INTO services (category_id, service_name, priority) VALUES
-- Maternal Care
(1, 'Prenatal check-up', 'Regular'),
(1, 'Postnatal care', 'Regular'),
(1, 'Safe motherhood education', 'Regular'),

-- Child Health Services
(2, 'Newborn check-up', 'Regular'),
(2, 'Immunization/vaccination programs', 'Regular'),
(2, 'Growth monitoring (weighing, height measurement)', 'Regular'),

-- Family Planning
(3, 'Counseling sessions', 'Regular'),
(3, 'Distribution of contraceptives (pills, condoms, injectables)', 'Regular'),
(3, 'Natural family planning guidance', 'Regular'),

-- Basic Medical Services
(4, 'First aid treatment for minor injuries', 'Urgent'),
(4, 'Consultation for common illnesses (fever, cough, colds, diarrhea)', 'Regular'),
(4, 'Vital signs monitoring (BP, temperature, weight)', 'Regular'),
(4, 'Referral to hospitals for advanced care', 'Priority Case'),

-- Nutrition Programs
(5, 'Operation Timbang (child weighing)', 'Regular'),
(5, 'Nutrition and diet counseling', 'Regular'),
(5, 'Vitamin supplementation (Vit. A, Iron, etc.)', 'Regular'),

-- Communicable Disease Control
(6, 'Tuberculosis (TB) screening and referral', 'Urgent'),
(6, 'Dengue monitoring and awareness campaigns', 'Urgent'),
(6, 'COVID-19 monitoring', 'Urgent'),
(6, 'Rabies prevention information', 'Urgent'),

-- Health Education & Counseling
(7, 'Hygiene and sanitation education', 'Regular'),
(7, 'Adolescent health counseling', 'Regular'),
(7, 'Awareness programs for diabetes, hypertension, etc.', 'Regular'),

-- Environmental Health & Sanitation Services
(8, 'Water sanitation and safety awareness', 'Regular'),
(8, 'Waste disposal education', 'Regular'),
(8, 'Community health surveillance', 'Regular'),

-- Senior Citizen Health Services
(9, 'Blood pressure check', 'Regular'),
(9, 'Basic medical consultation', 'Regular'),
(9, 'Maintenance medicine distribution', 'Regular'),

-- Administrative & Health Records Services
(10, 'Updating barangay health records', 'Regular'),
(10, 'Health referrals and documents', 'Regular'),
(10, 'Assistance with health certificates', 'Regular');

-- NOTE: User accounts (admin, staff, resident) are NOT created here.
-- Authentication is handled entirely by Supabase Auth. Create users via the
-- Supabase dashboard or the Auth Admin API, and store their role/username in
-- auth.users.user_metadata, e.g.:
--   { "username": "admin", "role": "admin", "full_name": "System Administrator" }

-- ==================== VIEWS ====================

-- View for queue with patient details
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

-- View for visit log with patient details
CREATE OR REPLACE VIEW visit_log_with_patient_details AS
SELECT
    v.visit_id,
    v.patient_id,
    p.first_name,
    p.last_name,
    p.middle_name,
    p.age,
    p.sex,
    p.contact_number,
    p.address,
    v.visit_date,
    v.service_category,
    v.service_name,
    v.priority,
    v.chief_complaint,
    v.civil_status,
    v.occupation,
    v.philhealth_number,
    v.emergency_contact_person,
    v.emergency_contact_number,
    v.allergies,
    v.chronic_conditions,
    v.current_medications,
    v.diagnosis,
    v.treatment,
    v.prescription,
    v.vital_signs,
    v.notes,
    v.time_queued,
    v.time_served,
    v.attended_by,
    v.created_at
FROM visit_log v
JOIN patients p ON v.patient_id = p.patient_id;

-- ==================== STORED PROCEDURES ====================

-- Function to generate next patient ID
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS VARCHAR AS $$
DECLARE
    next_id INTEGER;
    new_patient_id VARCHAR(20);
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id FROM 9) AS INTEGER)), 0) + 1
    INTO next_id
    FROM patients
    WHERE patient_id LIKE 'PT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%';
    
    new_patient_id := 'PT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_id::TEXT, 4, '0');
    RETURN new_patient_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next queue number
CREATE OR REPLACE FUNCTION get_next_queue_number()
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(queue_number), 0) + 1
    INTO next_number
    FROM queue
    WHERE DATE(created_at) = CURRENT_DATE;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- ==================== ANALYTICS FUNCTIONS ====================

-- Function to get visit statistics for a date range
CREATE OR REPLACE FUNCTION get_visit_statistics(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    total_visits BIGINT,
    priority_cases BIGINT,
    urgent_cases BIGINT,
    regular_cases BIGINT,
    service_category VARCHAR,
    service_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_visits,
        COUNT(CASE WHEN priority = 'Priority Case' THEN 1 END)::BIGINT as priority_cases,
        COUNT(CASE WHEN priority = 'Urgent' THEN 1 END)::BIGINT as urgent_cases,
        COUNT(CASE WHEN priority = 'Regular' THEN 1 END)::BIGINT as regular_cases,
        visit_log.service_category,
        COUNT(*)::BIGINT as service_count
    FROM visit_log
    WHERE visit_date BETWEEN start_date AND end_date
    GROUP BY visit_log.service_category;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON TABLE audit_log TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'HealthTrack database schema created successfully!';
    RAISE NOTICE 'Authentication is handled by Supabase Auth (auth.users).';
    RAISE NOTICE 'Create users via the Supabase dashboard and set username/role in user_metadata.';
END $$;
