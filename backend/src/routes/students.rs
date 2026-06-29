use axum::{routing::{get, post}, Router};
use crate::api::students::{create_student, get_students, get_student, delete_student};

pub fn student_routes() -> Router {
    Router::new()
        .route("/", post(create_student).get(get_students))
        .route("/{id}", get(get_student).delete(delete_student))
}
