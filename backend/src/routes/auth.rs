use axum::{routing::post, Router};
use crate::api::auth::{register, login};

pub fn auth_routes() -> Router {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
}
