use axum::{routing::{get, post}, Router};
use crate::api::visits::{create_visit, get_visits, get_visit, delete_visit};

pub fn visit_routes() -> Router {
    Router::new()
        .route("/", post(create_visit).get(get_visits))
        .route("/:id", get(get_visit).delete(delete_visit))
}
