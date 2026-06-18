use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;
use std::time::Duration;

use sqlx::postgres::{PgConnectOptions, PgSslMode};
use std::str::FromStr;

pub async fn init_db_pool() -> Option<PgPool> {
    let enable_pool = env::var("ENABLE_DATABASE_POOL")
        .map(|value| matches!(value.trim().to_lowercase().as_str(), "1" | "true" | "yes"))
        .unwrap_or(false);

    if !enable_pool {
        eprintln!(
            "ENABLE_DATABASE_POOL is not true; starting without a local Postgres pool. Supabase REST endpoints can still run."
        );
        return None;
    }

    let db_url: String = match env::var("DATABASE_URL") {
        Ok(value) if !value.trim().is_empty() => value.trim().to_string(),
        _ => {
            eprintln!(
                "DATABASE_URL is not set; starting without a local Postgres pool. Supabase REST endpoints can still run."
            );
            return None;
        }
    };

    let mut options: PgConnectOptions = match PgConnectOptions::from_str(&db_url) {
        Ok(options) => options,
        Err(err) => {
            eprintln!("Invalid DATABASE_URL; starting without local Postgres pool: {}", err);
            return None;
        }
    };

    options = options.statement_cache_capacity(0);

    let url_lower = db_url.to_lowercase();

    if url_lower.contains("supabase.co") || url_lower.contains("neon.tech") {
        options = options.ssl_mode(PgSslMode::Require);
    }

    Some(PgPoolOptions::new()
        .max_connections(5)
        .min_connections(0)
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect_lazy_with(options))
}
