use crate::api::medical_documents::{
    create_medical_document, delete_medical_document, get_medical_documents,
};
use axum::{routing::post, Router};

pub fn medical_document_routes() -> Router {
    Router::new()
        .route(
            "/",
            post(create_medical_document).get(get_medical_documents),
        )
        .route("/{id}", axum::routing::delete(delete_medical_document))
}
