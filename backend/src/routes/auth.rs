use crate::api::auth::{login, register};
use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;

async fn storage_test(State(_state): State<crate::api::auth::AppState>) -> Json<serde_json::Value> {
    // Attempt to upload a small text file to the configured Supabase storage.
    // The bucket name may vary in your Supabase project; adjust as needed.
    let bucket = "uploads";
    let path = format!("test-{}.txt", chrono::Utc::now().timestamp());
    let bytes = b"test upload from backend".to_vec();

    match crate::supabase::upload_file(bucket, &path, bytes).await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            Json(json!({"status": "ok", "upload_status": status, "path": path}))
        }
        Err(e) => Json(json!({"status": "error", "error": e.to_string()})),
    }
}

async fn health_check(State(state): State<crate::api::auth::AppState>) -> Json<serde_json::Value> {
    match sqlx::query("SELECT 1 as test").fetch_one(&state.db).await {
        Ok(_) => Json(json!({
            "status": "ok",
            "database": "connected",
            "timestamp": chrono::Utc::now().to_rfc3339()
        })),
        Err(e) => Json(json!({
            "status": "error",
            "database": "disconnected",
            "error": e.to_string(),
            "timestamp": chrono::Utc::now().to_rfc3339()
        })),
    }
}

pub fn auth_routes() -> Router<crate::api::auth::AppState> {
    Router::new()
        .route("/health", get(health_check))
        .route("/health/storage", get(storage_test))
        .route("/register", post(register))
        .route("/login", post(login))
}

pub use crate::api::auth::AppState;
