pub mod api;
pub mod routes;
pub mod db;
pub mod limiters;
pub mod security;

use axum::{
    extract::Extension,
    http::{Method, StatusCode},
    middleware,
    response::{IntoResponse, Html},
    routing::get,
    Json, Router,
};
use serde_json::json;
use std::env;

use tower_http::{cors::CorsLayer, services::ServeDir, set_header::SetResponseHeaderLayer, trace::TraceLayer};
use axum::http::header::CONTENT_TYPE;
use axum::http::HeaderValue;
use std::path::PathBuf;
use mime_guess;
use db::init_db_pool;
use routes::auth::auth_routes;
use api::auth::AppState;
use limiters::{ConcurrencyLimiter, enforce_concurrency};


#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    load_env();

    let client_origins = env::var("CLIENT_URL").unwrap_or_default();
    let limiter = ConcurrencyLimiter::new(5);

    let port = env::var("PORT").unwrap_or_else(|_| "8000".to_string());

    let cors = {
        let client_origins = client_origins
            .split(',')
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>();

        if client_origins.is_empty() {
            CorsLayer::permissive()
        } else {
            let mut cors = CorsLayer::new()
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                .allow_headers([
                    axum::http::header::CONTENT_TYPE,
                    axum::http::header::AUTHORIZATION,
                    axum::http::header::ACCEPT,
                    axum::http::header::ACCEPT_LANGUAGE,
                    axum::http::header::ACCEPT_ENCODING,
                ])
                .allow_credentials(true);

            for origin in client_origins {
                cors = cors.allow_origin(
                    HeaderValue::from_str(origin)
                        .expect("CLIENT_URL must contain valid origins like https://your-app.vercel.app"),
                );
            }

            cors
        }
    };

    let db_pool = init_db_pool().await;

    let jwt_secret = match env::var("JWT_SECRET") {
        Ok(secret) if !secret.trim().is_empty() => secret,
        _ => {
            tracing::error!("JWT_SECRET is not set or empty. Using insecure default secret.");
            "default_secret_key_change_me_in_production".to_string()
        }
    };
    let state = AppState {
        db: db_pool.clone(),
        jwt_secret,
    };

    let api = auth_routes()
        .layer(Extension(state))
        .layer(middleware::from_fn(move |req, next| {
            enforce_concurrency(limiter.clone(), req, next)
        }))
        .layer(cors)
        .layer(SetResponseHeaderLayer::if_not_present(
            axum::http::header::STRICT_TRANSPORT_SECURITY,
            axum::http::HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(TraceLayer::new_for_http());

    // Serve static files from `public/` using small handlers for single files.

    use axum::http::HeaderMap;

    async fn serve_static(base: &str, path: PathBuf) -> (HeaderMap, Vec<u8>) {
        let full = std::path::Path::new(base).join(&path);
        if !full.exists() || !full.is_file() {
            let mut headers = HeaderMap::new();
            headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/plain; charset=utf-8"));
            return (headers, b"Not found".to_vec());
        }

        match tokio::fs::read(&full).await {
            Ok(body) => {
                let mime = mime_guess::from_path(&full).first_or_octet_stream();
                let mut headers = HeaderMap::new();
                headers.insert(
                    CONTENT_TYPE,
                    HeaderValue::from_str(mime.as_ref()).unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
                );
                (headers, body)
            }
            Err(_) => {
                let mut headers = HeaderMap::new();
                headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/plain; charset=utf-8"));
                (headers, b"Internal server error".to_vec())
            }
        }
    }

    let app = Router::new()
        // API routes first so they are reachable at /register and /login
        .merge(api)
        .route("/healthz", get(|| async { Json(json!({ "status": "ok" })) }))
        .route("/debug/users", get(debug_users))
        // Serve static asset folders at their expected paths
        .nest_service("/assets", ServeDir::new("public/assets"))
        .nest_service("/images", ServeDir::new("public/images"))
        .route("/favicon.svg", get(|| async { serve_static("public", PathBuf::from("favicon.svg")).await }))
        .route("/icons.svg", get(|| async { serve_static("public", PathBuf::from("icons.svg")).await }))
        // SPA fallback for all other routes
        .fallback_service(get(|| async {
            let index_path = std::path::Path::new("public/index.html");
            if index_path.exists() {
                match tokio::fs::read_to_string(index_path).await {
                    Ok(contents) => Html(contents).into_response(),
                    Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error").into_response(),
                }
            } else {
                const FALLBACK: &str = "<!doctype html><html><body><h1>Backend running</h1><p>Frontend not built into image.</p></body></html>";
                Html(FALLBACK).into_response()
            }
        }));

    let addr = format!("0.0.0.0:{}", port);
    println!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Server listening on http://{}", addr);
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await
    .unwrap();
}

fn load_env() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let current_dir = env::current_dir().unwrap_or_else(|_| manifest_dir.clone());

    for env_file in [
        current_dir.join(".env.local"),
        manifest_dir.join(".env.local"),
        current_dir.join(".env"),
        manifest_dir.join(".env"),
    ] {
        dotenvy::from_path(env_file).ok();
    }
}

async fn debug_users(Extension(state): Extension<AppState>) -> impl IntoResponse {
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users").fetch_one(&state.db).await {
        Ok(count) => Json(json!({
            "users_table_exists": true,
            "users_count": count,
        }))
        .into_response(),
        Err(err) => {
            tracing::error!(error = ?err, "Debug DB query failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Unable to query users table",
                    "details": err.to_string(),
                })),
            )
                .into_response()
        }
    }
}
