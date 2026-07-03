-- School Clinic Database Schema (PostgreSQL / Supabase compatible)
-- This script sets up all tables, relationships, constraints, and indexes.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean drop of all tables if they exist to prevent schema conflicts
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS inventory_logs CASCADE;
DROP TABLE IF EXISTS bmi_records CASCADE;
DROP TABLE IF EXISTS medical_documents CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

-- =========================================================================
-- 1. USERS TABLE (For Clinic Staff Authentication)
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'Nurse',
    contact_number VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user authentication checks
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =========================================================================
-- 2. STUDENTS TABLE (Patient Records - Students)
-- =========================================================================
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY, -- Manual IDs like 'S-1001'
    name VARCHAR(255) NOT NULL,
    section VARCHAR(100),       -- Combined Grade & Section/Program (e.g., 'Grade 10 - A')
    concern TEXT,               -- Current concern / medical reason for registry
    status VARCHAR(50) NOT NULL DEFAULT 'Cleared' CHECK (status IN ('Pending', 'Cleared')),
    age INTEGER,
    gender VARCHAR(50) CHECK (gender IN ('Male', 'Female', 'Other')),
    year_level VARCHAR(50),
    program VARCHAR(50),
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- =========================================================================
-- 3. STAFF TABLE (Patient Records - School Staff)
-- =========================================================================
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(50) PRIMARY KEY, -- Manual IDs like 'T-2001'
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    concern TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Cleared' CHECK (status IN ('Pending', 'Cleared')),
    age INTEGER,
    gender VARCHAR(50) CHECK (gender IN ('Male', 'Female', 'Other')),
    staff_type VARCHAR(100),    -- 'Teacher', 'Non-Teaching', etc.
    position VARCHAR(100),
    contact_number VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- =========================================================================
-- 4. VISITS TABLE (Clinic Consultations and Visits Log)
-- =========================================================================
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_type VARCHAR(50) NOT NULL CHECK (patient_type IN ('Student', 'Staff')),
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) REFERENCES staff(id) ON DELETE CASCADE,
    temperature VARCHAR(20),       -- Body temp e.g. "36.8"
    blood_pressure VARCHAR(20),    -- BP e.g. "120/80"
    referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
    reason_for_visit TEXT NOT NULL,
    medicine_given VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Completed', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure exactly one patient reference is filled based on patient_type
    CONSTRAINT chk_visit_patient_reference CHECK (
        (patient_type = 'Student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
        (patient_type = 'Staff' AND staff_id IS NOT NULL AND student_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_visits_patient_type ON visits(patient_type);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_student_id ON visits(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_staff_id ON visits(staff_id) WHERE staff_id IS NOT NULL;

-- =========================================================================
-- 5. INVENTORY TABLE (Medicines and Supplies)
-- =========================================================================
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY, -- Manual/Generated IDs like 'INV-178...'
    name VARCHAR(255) UNIQUE NOT NULL,
    dosage VARCHAR(100),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    unit VARCHAR(50) DEFAULT 'tablet',
    status VARCHAR(50) NOT NULL DEFAULT 'Available',
    expiry DATE,
    supplier VARCHAR(255),
    location VARCHAR(255),
    remarks TEXT,
    keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);

-- =========================================================================
-- 6. INVENTORY LOGS TABLE (Activity Log for Medicine and Supplies)
-- =========================================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
    id VARCHAR(50) PRIMARY KEY, -- Manual/Generated IDs like 'LOG-178...'
    date_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    medicine VARCHAR(255),
    action VARCHAR(255) NOT NULL, -- e.g., 'Medicine added to inventory', 'Stock Added', etc.
    qty INTEGER,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
    student_name VARCHAR(255),
    staff_id VARCHAR(50) REFERENCES staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(255),
    performed_by VARCHAR(255) DEFAULT 'Master Admin',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inv_logs_date_time ON inventory_logs(date_time);

-- =========================================================================
-- 7. BMI RECORDS TABLE (Student BMI History)
-- =========================================================================
CREATE TABLE IF NOT EXISTS bmi_records (
    id VARCHAR(50) PRIMARY KEY, -- Manual IDs like 'BMI-1001'
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255), -- Denormalized for convenience in UI mapping
    height NUMERIC(5, 2) NOT NULL, -- in cm
    weight NUMERIC(5, 2) NOT NULL, -- in kg
    bmi NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- e.g. 'Normal', 'Overweight', 'Underweight', 'Obese'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bmi_student_id ON bmi_records(student_id);
CREATE INDEX IF NOT EXISTS idx_bmi_created_at ON bmi_records(created_at);

-- =========================================================================
-- 8. MEDICAL DOCUMENTS TABLE (Student Medical Files Archive)
-- =========================================================================
CREATE TABLE IF NOT EXISTS medical_documents (
    id VARCHAR(50) PRIMARY KEY, -- Manual IDs like 'DOC-1001'
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255),  -- Denormalized for convenience in UI mapping
    year_level VARCHAR(50),
    program VARCHAR(50),
    document_type VARCHAR(100) NOT NULL, -- e.g., 'Medical Certificate', 'Laboratory Result'
    document_date DATE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_med_docs_student_id ON medical_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_med_docs_created_at ON medical_documents(created_at);


-- =========================================================================
-- MOCK DATA SEEDING (Optional - Run to populate tables for testing)
-- =========================================================================

-- Seed Students
INSERT INTO students (id, name, section, concern, status, age, gender, year_level, program, parent_name, parent_phone) VALUES
('S-1001', 'Juan Dela Cruz', 'Grade 10 - A', 'Headache', 'Pending', 16, 'Male', 'Grade 10', 'A', 'Jose Dela Cruz', '06123456748'),
('S-1002', 'Ana Reyes', 'Grade 11 - STEM', 'Medical certificate', 'Pending', 17, 'Female', 'Grade 11', 'STEM', 'Liza Reyes', '06123456748'),
('S-1003', 'Mark Villanueva', 'Grade 9 - B', 'Stomach pain', 'Cleared', 15, 'Male', 'Grade 9', 'B', 'Marites Villanueva', '06123456748'),
('S-1004', 'Ella Cruz', 'Grade 12 - HUMSS', 'First aid follow-up', 'Pending', 18, 'Female', 'Grade 12', 'HUMSS', 'Ramon Cruz', '06123456748')
ON CONFLICT (id) DO NOTHING;

-- Seed Staff
INSERT INTO staff (id, name, department, concern, status, age, gender, staff_type, position, contact_number, email) VALUES
('T-2001', 'Maria Santos', 'Registrar', 'Blood pressure check', 'Cleared', 34, 'Female', 'Non-Teaching', 'Registrar Staff', '09345678901', 'maria.santos@ccd.edu'),
('T-2002', 'Pedro Lim', 'Faculty', 'Medication request', 'Pending', 41, 'Male', 'Teacher', 'Teacher III', '09234567890', 'pedro.lim@ccd.edu'),
('502', 'June Ann', 'OHS', 'Fever', 'Pending', 29, 'Female', 'Non-Teaching', 'Clinic Staff', '09195', 'june.ann@ccd.edu')
ON CONFLICT (id) DO NOTHING;

-- Seed Users (Pre-registered nurse: email 'nurse@ccd.edu', password 'password123')
-- Hash is generated using Argon2id standard, compatible with Rust backend
INSERT INTO users (id, email, full_name, role, password_hash) VALUES
('a59cf801-4475-4081-8178-0cb99bb6ee9e', 'nurse@ccd.edu', 'Clinic Nurse Admin', 'Nurse', '$argon2id$v=19$m=4096,t=3,p=1$c29tZXNhbHQ$5w4QpS2X+rL2x14P2aWn2aF1O/dM1N8bB9E/oU9l3V0')
ON CONFLICT (email) DO NOTHING;

-- Seed Visits
INSERT INTO visits (id, patient_type, student_id, staff_id, temperature, blood_pressure, referred_to_hospital, reason_for_visit, medicine_given, status, created_at) VALUES
('1e48bc8f-889a-412e-9d2a-e8d1354bb881', 'Student', 'S-1001', NULL, '36.8', '110/70', FALSE, 'Headache', 'Paracetamol', 'Pending', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('be83f81e-9271-4a30-bf88-e9cb654b9bf8', 'Staff', NULL, 'T-2001', '36.5', '130/80', FALSE, 'Blood pressure check', '', 'Completed', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Seed Inventory
INSERT INTO inventory (id, name, dosage, stock, unit, status, expiry, supplier, location, remarks, keywords) VALUES
('INV-1001', 'Paracetamol', '500mg', 12, 'tablet', 'Available', '2028-12-31', 'Mercury Drug', 'Cabinet A', 'For fever and headaches', ARRAY['paracetamol', 'biogesic', 'fever']),
('INV-1002', 'Bandage Roll', '2 inch', 6, 'roll', 'Available', '2030-01-01', 'Watsons', 'Cabinet B', 'First aid dressing', ARRAY['bandage', 'dressing', 'wound']),
('INV-1003', 'Alcohol', '70% Isopropyl', 3, 'bottle', 'Low Stock', '2027-06-30', 'Mercury Drug', 'Counter Desk', 'Sanitizer', ARRAY['alcohol', 'sanitizer', 'rubbing'])
ON CONFLICT (name) DO NOTHING;

-- Seed Inventory Logs
INSERT INTO inventory_logs (id, date_time, medicine, action, qty, student_id, student_name, staff_id, staff_name, performed_by, notes) VALUES
('LOG-1001', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Paracetamol', 'Medicine added to inventory', 12, NULL, NULL, NULL, NULL, 'Master Admin', 'Initial stock setup'),
('LOG-1002', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Paracetamol', 'Stock Dispensed', 1, 'S-1001', 'Juan Dela Cruz', NULL, NULL, 'Clinic Nurse Admin', 'Dispensed for headache during visit')
ON CONFLICT (id) DO NOTHING;

-- Seed BMI Records
INSERT INTO bmi_records (id, student_id, student_name, height, weight, bmi, status, created_at) VALUES
('BMI-1001', 'S-1001', 'Juan Dela Cruz', 165.0, 58.5, 21.5, 'Normal', CURRENT_TIMESTAMP),
('BMI-1002', 'S-1002', 'Ana Reyes', 155.0, 49.5, 20.6, 'Normal', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('BMI-1003', 'S-1003', 'Mark Villanueva', 164.0, 77.0, 28.6, 'Overweight', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;
