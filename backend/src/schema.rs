use sqlx::{Executor, PgPool};

pub async fn ensure_schema(db: &PgPool) -> Result<(), sqlx::Error> {
    db.execute(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#).await?;
    db.execute(r#"CREATE EXTENSION IF NOT EXISTS pgcrypto"#).await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) NOT NULL DEFAULT 'Nurse',
            password_hash VARCHAR(255) NOT NULL,
            contact_number VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .await?;
    db.execute(r#"ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50)"#)
        .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"#)
        .await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS students (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            section VARCHAR(100),
            concern TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'Cleared',
            age INTEGER,
            gender VARCHAR(50),
            year_level VARCHAR(50),
            program VARCHAR(50),
            parent_name VARCHAR(255),
            parent_phone VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)"#)
        .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)"#)
        .await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS staff (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            concern TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'Cleared',
            age INTEGER,
            gender VARCHAR(50),
            staff_type VARCHAR(100),
            position VARCHAR(100),
            contact_number VARCHAR(50),
            email VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name)"#)
        .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status)"#)
        .await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS visits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_type VARCHAR(50) NOT NULL,
            student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
            staff_id VARCHAR(50) REFERENCES staff(id) ON DELETE CASCADE,
            temperature VARCHAR(20),
            blood_pressure VARCHAR(20),
            referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
            reason_for_visit TEXT NOT NULL,
            medicine_given VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'Completed',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at)"#)
        .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_visits_student_id ON visits(student_id) WHERE student_id IS NOT NULL"#)
        .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_visits_staff_id ON visits(staff_id) WHERE staff_id IS NOT NULL"#)
        .await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS inventory (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            dosage VARCHAR(100),
            stock INTEGER NOT NULL DEFAULT 0,
            unit VARCHAR(50) DEFAULT 'tablet',
            status VARCHAR(50) NOT NULL DEFAULT 'Available',
            expiry DATE,
            supplier VARCHAR(255),
            location VARCHAR(255),
            remarks TEXT,
            keywords TEXT[] DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name)"#)
        .await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS inventory_logs (
            id VARCHAR(50) PRIMARY KEY,
            date_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            medicine VARCHAR(255),
            action VARCHAR(255) NOT NULL,
            qty INTEGER,
            student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
            student_name VARCHAR(255),
            staff_id VARCHAR(50) REFERENCES staff(id) ON DELETE SET NULL,
            staff_name VARCHAR(255),
            performed_by VARCHAR(255) DEFAULT 'Master Admin',
            notes TEXT
        )
        "#,
    )
    .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_inv_logs_date_time ON inventory_logs(date_time)"#)
        .await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS bmi_records (
            id VARCHAR(50) PRIMARY KEY,
            student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            student_name VARCHAR(255),
            height NUMERIC(5, 2) NOT NULL,
            weight NUMERIC(5, 2) NOT NULL,
            bmi NUMERIC(5, 2) NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_bmi_student_id ON bmi_records(student_id)"#)
        .await?;

    db.execute(
        r#"
        CREATE TABLE IF NOT EXISTS medical_documents (
            id VARCHAR(50) PRIMARY KEY,
            student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            student_name VARCHAR(255),
            year_level VARCHAR(50),
            program VARCHAR(50),
            document_type VARCHAR(100) NOT NULL,
            document_date DATE NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            remarks TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .await?;
    db.execute(r#"CREATE INDEX IF NOT EXISTS idx_med_docs_student_id ON medical_documents(student_id)"#)
        .await?;

    Ok(())
}
