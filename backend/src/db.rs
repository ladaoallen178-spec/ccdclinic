use sqlx::{PgPool, postgres::PgPoolOptions};
use std::env;
use std::time::Duration;
use tracing::{error, info};

use sqlx::postgres::{PgConnectOptions, PgSslMode};
use std::str::FromStr;

pub async fn init_db_pool() -> PgPool {
    let db_url: String = env::var("DATABASE_URL")
        .unwrap_or_else(|_| {
            eprintln!("\n❌ ERROR: DATABASE_URL environment variable is not set!");
            eprintln!("\nFor Render deployment:");
            eprintln!("  1. Go to your service in Render dashboard");
            eprintln!("  2. Click 'Environment'");
            eprintln!("  3. Add DATABASE_URL with your database connection string");
            eprintln!("  4. Format: postgresql://user:password@host:port/database?sslmode=require\n");
            eprintln!("For local development:");
            eprintln!("  1. Create a .env file (see .env.example)");
            eprintln!("  2. Run: cargo run\n");
            std::process::exit(1);
        })
        .trim()
        .to_string();

    let url_lower = db_url.to_lowercase();
    let normalized_db_url = if (url_lower.contains("supabase.co") || url_lower.contains("supabase.com") || url_lower.contains("neon.tech"))
        && !url_lower.contains("sslmode=")
    {
        if db_url.contains('?') {
            format!("{}&sslmode=require", db_url)
        } else {
            format!("{}?sslmode=require", db_url)
        }
    } else {
        db_url.clone()
    };

    let mut options: PgConnectOptions =
        match PgConnectOptions::from_str(&normalized_db_url) {
            Ok(opts) => opts,
            Err(err) => {
                eprintln!("\n❌ ERROR: Invalid DATABASE_URL format!");
                eprintln!("Error: {}\n", err);
                eprintln!("Expected format: postgresql://username:password@host:port/database");
                eprintln!("Example for Supabase: postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres?sslmode=require\n");
                std::process::exit(1);
            }
        };

    options = options.statement_cache_capacity(0);

    if url_lower.contains("supabase.co") || url_lower.contains("supabase.com") || url_lower.contains("neon.tech") {
        options = options.ssl_mode(PgSslMode::Require);
    }

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .min_connections(0)
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect_lazy_with(options);

    match sqlx::query_scalar::<_, i32>("SELECT 1").fetch_one(&pool).await {
        Ok(_) => info!("Database connection verified successfully."),
        Err(err) => {
            error!(error = ?err, "Unable to verify database connection during startup.");
            eprintln!("\n❌ DATABASE CONNECTION FAILED!");
            eprintln!("Error: {:?}\n", err);
            eprintln!("Possible causes:");
            eprintln!("  1. Invalid DATABASE_URL (check format and credentials)");
            eprintln!("  2. Database server is not running or unreachable");
            eprintln!("  3. Incorrect username or password");
            eprintln!("  4. Network/firewall blocking connection");
            eprintln!("  5. Database doesn't exist\n");
            eprintln!("Check your DATABASE_URL and try again.\n");
            std::process::exit(1);
        }
    }

    if let Err(err) = ensure_auth_schema(&pool).await {
        error!(error = ?err, "Failed to initialize auth schema and seed user.");
        std::process::exit(1);
    }

    if let Err(err) = ensure_clinic_schema(&pool).await {
        error!(error = ?err, "Failed to initialize clinic schema.");
        std::process::exit(1);
    }

    pool
}

async fn ensure_auth_schema(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) NOT NULL DEFAULT 'Nurse',
            contact_number VARCHAR(50),
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)
        "#,
    )
    .execute(pool)
    .await?;

    info!("Auth schema bootstrap completed.");
    Ok(())
}

async fn ensure_clinic_schema(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "pgcrypto""#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS students (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            section VARCHAR(100),
            concern TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'Cleared' CHECK (status IN ('Pending', 'Cleared')),
            age INTEGER,
            gender VARCHAR(50),
            year_level VARCHAR(50),
            program VARCHAR(50),
            parent_name VARCHAR(255),
            parent_phone VARCHAR(50),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS staff (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            concern TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'Cleared' CHECK (status IN ('Pending', 'Cleared')),
            age INTEGER,
            gender VARCHAR(50),
            staff_type VARCHAR(100),
            position VARCHAR(100),
            contact_number VARCHAR(50),
            email VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS visits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_type VARCHAR(50) NOT NULL CHECK (patient_type IN ('Student', 'Staff')),
            student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
            staff_id VARCHAR(50) REFERENCES staff(id) ON DELETE CASCADE,
            patient_name VARCHAR(255),
            temperature VARCHAR(20),
            blood_pressure VARCHAR(20),
            referred_to_hospital BOOLEAN NOT NULL DEFAULT FALSE,
            reason_for_visit TEXT NOT NULL,
            medicine_given VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'Pending',
            visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            confirmed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_visit_patient_reference CHECK (
                (patient_type = 'Student' AND (student_id IS NOT NULL OR patient_name IS NOT NULL) AND staff_id IS NULL) OR
                (patient_type = 'Staff' AND staff_id IS NOT NULL AND student_id IS NULL)
            )
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("ALTER TABLE visits ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255)")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_date TIMESTAMPTZ DEFAULT NOW()")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE visits ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"ALTER TABLE visits
            DROP CONSTRAINT IF EXISTS chk_visit_patient_reference"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"ALTER TABLE visits
            ADD CONSTRAINT chk_visit_patient_reference CHECK (
                (patient_type = 'Student' AND (student_id IS NOT NULL OR patient_name IS NOT NULL) AND staff_id IS NULL) OR
                (patient_type = 'Staff' AND staff_id IS NOT NULL AND student_id IS NULL)
            )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS bmi_records (
            id VARCHAR(100) PRIMARY KEY,
            student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            student_name VARCHAR(255),
            height DOUBLE PRECISION NOT NULL,
            weight DOUBLE PRECISION NOT NULL,
            bmi DOUBLE PRECISION NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        DELETE FROM bmi_records older
        USING bmi_records newer
        WHERE older.student_id = newer.student_id
          AND (older.created_at, older.id) < (newer.created_at, newer.id)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_bmi_records_student_id_unique ON bmi_records(student_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_medical_documents_student_id ON medical_documents(student_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_medical_documents_created_at ON medical_documents(created_at)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inventory (
            id VARCHAR(50) PRIMARY KEY,
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inventory_logs (
            id VARCHAR(50) PRIMARY KEY,
            date_time TIMESTAMPTZ DEFAULT NOW(),
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
    .execute(pool)
    .await?;

    info!("Clinic schema bootstrap completed.");
    Ok(())
}
