
-- HealthTrack Revision Upgrade SQL
-- Added guardian validation, doctors, schedules, holidays, and appointment improvements

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS guardian_contact VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(120);

CREATE TABLE IF NOT EXISTS doctors (
    doctor_id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    availability_status VARCHAR(20) DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS holidays (
    holiday_id SERIAL PRIMARY KEY,
    holiday_name VARCHAR(150),
    holiday_date DATE UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id VARCHAR(20) REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    case_type VARCHAR(120) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO doctors (full_name, specialization)
VALUES
('Dr. Maria Santos', 'General Physician'),
('Dr. Juan Dela Cruz', 'Pediatrician'),
('Dr. Ana Reyes', 'Internal Medicine'),
('Nurse Carla Mendoza', 'Nurse'),
('Midwife Rose Flores', 'Midwife')
ON CONFLICT DO NOTHING;
