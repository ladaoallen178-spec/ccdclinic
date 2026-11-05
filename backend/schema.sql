-- PostgreSQL / Supabase schema for the School Clinic application.
-- Safe to apply repeatedly: it does not drop tables or insert demo credentials.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);

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
    patient_name VARCHAR(255),
    temperature VARCHAR(20),       -- Body temp e.g. "36.8"
    blood_pressure VARCHAR(20),    -- BP e.g. "120/80"
    referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
    reason_for_visit TEXT NOT NULL,
    medicine_given VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Completed', etc.
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure exactly one patient reference is filled based on patient_type
    CONSTRAINT chk_visit_patient_reference CHECK (
        (patient_type = 'Student' AND (student_id IS NOT NULL OR patient_name IS NOT NULL) AND staff_id IS NULL) OR
        (patient_type = 'Staff' AND staff_id IS NOT NULL AND student_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_visits_patient_type ON visits(patient_type);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_student_id ON visits(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_staff_id ON visits(staff_id) WHERE staff_id IS NOT NULL;

ALTER TABLE visits ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE visits ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

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

DELETE FROM bmi_records older
USING bmi_records newer
WHERE older.student_id = newer.student_id
    AND (older.created_at, older.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bmi_records_student_id_unique ON bmi_records(student_id);

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
