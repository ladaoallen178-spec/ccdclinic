pub mod api;
pub mod routes;
pub mod db;
pub mod limiters;
pub mod security;

use axum::{http::{Method, StatusCode}, middleware::{self}, Extension, Router, routing::get_service};
use dotenvy::dotenv;
use std::env;

use tower_http::{cors::{CorsLayer}, set_header::SetResponseHeaderLayer, trace::TraceLayer, services::{ServeDir, ServeFile}};
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

    // Serve static files from `public/` and provide SPA fallback to `public/index.html`.
    let static_service = get_service(ServeDir::new("public")).handle_error(|_| async move {
        (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
    });

    let app = Router::new()
        .nest_service("/", static_service)
        .merge(api)
        .fallback_service(get_service(ServeFile::new("public/index.html")).handle_error(|_| async move {
            (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
        }));

    let addr = format!("0.0.0.0:{}", port);
    println!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
