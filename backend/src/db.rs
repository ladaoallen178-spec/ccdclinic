use sqlx::{PgPool, postgres::PgPoolOptions};
use std::env;
use std::time::Duration;
use tracing::{error, info};

use sqlx::postgres::{PgConnectOptions, PgSslMode};
use std::str::FromStr;

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

    pool
}