use sqlx::{PgPool, postgres::PgPoolOptions};
use std::env;
use std::time::Duration;
use tracing::{error, info};

use sqlx::postgres::{PgConnectOptions, PgSslMode};
use std::str::FromStr;
use uuid::Uuid;

const DEFAULT_NURSE_EMAIL: &str = "nurse@ccd.edu";
const DEFAULT_NURSE_NAME: &str = "Clinic Nurse Admin";
const DEFAULT_NURSE_ROLE: &str = "Nurse";
const DEFAULT_NURSE_HASH: &str = "$argon2id$v=19$m=4096,t=3,p=1$c29tZXNhbHQ$5w4QpS2X+rL2x14P2aWn2aF1O/dM1N8bB9E/oU9l3V0";

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

    let mut options: PgConnectOptions =
        match PgConnectOptions::from_str(&db_url) {
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

    let url_lower = db_url.to_lowercase();

    if url_lower.contains("supabase.co") || url_lower.contains("neon.tech") {
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
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO users (id, email, full_name, role, password_hash, created_at)
        SELECT $1, $2, $3, $4, $5, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE email = $2
        )
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(DEFAULT_NURSE_EMAIL)
    .bind(DEFAULT_NURSE_NAME)
    .bind(DEFAULT_NURSE_ROLE)
    .bind(DEFAULT_NURSE_HASH)
    .execute(pool)
    .await?;

    info!(email = DEFAULT_NURSE_EMAIL, "Auth bootstrap completed.");
    Ok(())
}