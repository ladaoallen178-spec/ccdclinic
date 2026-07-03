use crate::api::visits::{confirm_visit, create_visit, delete_visit, get_visit, get_visits};
use axum::{
    routing::{get, patch, post},
    Router,
};

pub fn visit_routes() -> Router {
    Router::new()
        .route("/", post(create_visit).get(get_visits))
        .route("/{id}/confirm", patch(confirm_visit))
        .route("/{id}", get(get_visit).delete(delete_visit))
}
