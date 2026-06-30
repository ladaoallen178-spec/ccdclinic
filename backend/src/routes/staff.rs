use crate::api::staff::{create_staff, delete_staff, get_staff, get_staff_member};
use axum::{
    routing::{get, post},
    Router,
};

pub fn staff_routes() -> Router {
    Router::new()
        .route("/", post(create_staff).get(get_staff))
        .route("/{id}", get(get_staff_member).delete(delete_staff))
}
