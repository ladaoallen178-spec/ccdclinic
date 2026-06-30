use crate::api::auth::{list_users, login, register};
use axum::{routing::post, Router};

pub fn auth_routes() -> Router {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/api/users", axum::routing::get(list_users))
}
