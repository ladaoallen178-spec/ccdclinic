pub mod api;
pub mod routes;
pub mod db;
pub mod limiters;
pub mod security;

use axum::{http::{Method}, middleware::{self}, Extension};
use dotenvy::dotenv;
use std::env;

use tower_http::{cors::{CorsLayer}, set_header::SetResponseHeaderLayer, trace::TraceLayer,};
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

    let app = auth_routes()
        .with_state(state)
        .layer(Extension(db_pool))
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
        .layer(TraceLayer::new_for_http());

    let addr = format!("0.0.0.0:{}", port);
    println!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
