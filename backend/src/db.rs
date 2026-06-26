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
        .expect("DATABASE_URL must be set")
        .trim()
        .to_string();

    let mut options: PgConnectOptions =
        PgConnectOptions::from_str(&db_url)
            .expect("Invalid DATABASE_URL");

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