use axum::{
    routing::{delete, get, put},
    Router,
};

use crate::api::clinic::{
    create_bmi_record, create_inventory_log, create_medical_document, create_visit,
    delete_inventory, delete_medical_document, delete_staff, delete_student, list_bmi_records,
    list_inventory, list_inventory_logs, list_medical_documents, list_nurses, list_staff,
    list_students, list_visits, upsert_inventory, upsert_staff, upsert_student,
};

pub fn clinic_routes() -> Router<crate::api::auth::AppState> {
    Router::new()
        .route("/students", get(list_students).post(upsert_student))
        .route("/students/{id}", put(upsert_student).delete(delete_student))
        .route("/staff", get(list_staff).post(upsert_staff))
        .route("/staff/{id}", put(upsert_staff).delete(delete_staff))
        .route("/visits", get(list_visits).post(create_visit))
        .route("/inventory", get(list_inventory).post(upsert_inventory))
        .route("/inventory/{id}", put(upsert_inventory).delete(delete_inventory))
        .route("/inventory-logs", get(list_inventory_logs).post(create_inventory_log))
        .route("/bmi-records", get(list_bmi_records).post(create_bmi_record))
        .route("/medical-documents", get(list_medical_documents).post(create_medical_document))
        .route("/medical-documents/{id}", delete(delete_medical_document))
        .route("/nurses", get(list_nurses))
}
