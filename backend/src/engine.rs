pub mod api;
pub mod routes;
pub mod db;
pub mod limiters;
pub mod security;

use axum::{http::{Method, StatusCode, header::HeaderValue as AxHeaderValue}, middleware, Extension, Router, routing::get};
use dotenvy::dotenv;
use std::env;

use tower_http::{cors::{CorsLayer}, set_header::SetResponseHeaderLayer, trace::TraceLayer};
use axum::{extract::Path as AxPath, response::{IntoResponse, Html, Response}};
use axum::http::header::CONTENT_TYPE;
use axum::http::HeaderValue;
use std::path::PathBuf;
use mime_guess;
use db::init_db_pool;
use routes::auth::{auth_routes, AppState};
use limiters::{ConcurrencyLimiter, enforce_concurrency};


#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenv().ok();

    let client_origin = env::var("CLIENT_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());
    let limiter = ConcurrencyLimiter::new(5);

    let port = env::var("PORT").unwrap_or_else(|_| "8000".to_string());

    let cors = CorsLayer::new()
        .allow_origin(
            client_origin.parse::<axum::http::HeaderValue>().unwrap()
        )
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::header::ACCEPT_LANGUAGE,
            axum::http::header::ACCEPT_ENCODING,
        ])
        .allow_credentials(true);

    let db_pool = init_db_pool().await;

    let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "default_secret_key_change_me_in_production".to_string());
    let state = AppState {
        db: db_pool.clone(),
        jwt_secret,
    };

    let api = auth_routes()
        .with_state(state)
        .layer(Extension(db_pool))
        .layer(middleware::from_fn(move |req, next| {
            enforce_concurrency(limiter.clone(), req, next)
        }))
        .layer(cors)
        .layer(SetResponseHeaderLayer::if_not_present(
            axum::http::header::STRICT_TRANSPORT_SECURITY,
            axum::http::HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(TraceLayer::new_for_http());

    // Serve static files from `public/` using small handlers (avoids tower-http fs feature)

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
        // Serve static asset folders at their expected paths
        .nest(
            "/assets",
            Router::new().route("/*path", get(|AxPath(path): AxPath<PathBuf>| async move { serve_static("public/assets", path).await })),
        )
        .nest(
            "/images",
            Router::new().route("/*path", get(|AxPath(path): AxPath<PathBuf>| async move { serve_static("public/images", path).await })),
        )
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
    axum::serve(listener, app).await.unwrap();
}
