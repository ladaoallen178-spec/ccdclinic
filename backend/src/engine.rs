pub mod api;
pub mod db;
pub mod limiters;
pub mod routes;
pub mod security;
pub mod schema;
pub mod supabase;

use axum::{
    http::Method,
    middleware::{self},
    routing::get,
    Json, Router,
};
use dotenvy::dotenv;
use serde_json::json;
use std::env;

use db::init_db_pool;
use limiters::{enforce_concurrency, ConcurrencyLimiter};
use routes::{
    auth::{auth_routes, AppState},
    clinic::clinic_routes,
};
use schema::ensure_schema;
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenv().ok();
    println!("Starting ccdclinic backend...");

    let limiter = ConcurrencyLimiter::new(5);

    let port = env::var("PORT").unwrap_or_else(|_| "8000".to_string());
    println!("Using PORT={}", port);

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_credentials(false)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::header::ACCEPT_LANGUAGE,
            axum::http::header::ACCEPT_ENCODING,
        ]);

    let db_pool = init_db_pool().await;
    println!("Database pool initialization step finished.");
    if let Some(db_pool) = db_pool.as_ref() {
        if let Err(err) = ensure_schema(db_pool).await {
            eprintln!("Warning: Failed to initialize database schema: {}", err);
            eprintln!("Continuing startup; some features may be degraded. Using Supabase REST fallback where available.");
            // Do not exit here; allow the server to start so the Supabase REST fallback
            // in the auth handlers can still be used when the local DB is unavailable.
        }
    } else {
        eprintln!("Skipping schema initialization because DATABASE_URL is unavailable.");
    }

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "default_secret_key_change_me_in_production".to_string());
    println!("Building HTTP router...");
    let state = AppState {
        db: db_pool.clone(),
        jwt_secret,
    };

    let api = auth_routes().merge(clinic_routes());
    let app = Router::new()
        .route(
            "/health",
            get(|| async {
                Json(json!({
                    "status": "ok",
                    "service": "ccdclinic",
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            }),
        )
        .nest("/api", api)
        .with_state(state)
        // .route_layer(middleware::from_fn_with_state(
        //     allowed_origin.clone()
        // ))
        .layer(middleware::from_fn(move |req, next| {
            enforce_concurrency(limiter.clone(), req, next)
        }))
        .layer(cors)
        .layer(SetResponseHeaderLayer::if_not_present(
            axum::http::header::STRICT_TRANSPORT_SECURITY,
            axum::http::HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(TraceLayer::new_for_http())
        .fallback_service(
            ServeDir::new("public").not_found_service(ServeFile::new("public/index.html")),
        );

    let addr = format!("0.0.0.0:{}", port);
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => {
            println!("Server running on http://{}", addr);
            listener
        }
        Err(err) => {
            eprintln!("Failed to bind to {}: {}", addr, err);
            eprintln!("Hint: another service may already be listening on this port.");
            std::process::exit(1);
        }
    };

    if let Err(err) = axum::serve(listener, app).await {
        eprintln!("Server error: {}", err);
        std::process::exit(1);
    }
}
