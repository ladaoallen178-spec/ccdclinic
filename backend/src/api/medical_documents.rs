use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tracing::{error, info};

use crate::api::auth::AppState;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct MedicalDocumentRecord {
    pub id: String,
    pub student_id: String,
    pub student_name: Option<String>,
    pub year_level: Option<String>,
    pub program: Option<String>,
    pub document_type: String,
    pub document_date: String,
    pub file_name: String,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMedicalDocumentRequest {
    pub id: String,
    pub student_id: String,
    pub student_name: Option<String>,
    pub year_level: Option<String>,
    pub program: Option<String>,
    pub document_type: String,
    pub document_date: String,
    pub file_name: String,
    pub remarks: Option<String>,
}

pub async fn create_medical_document(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateMedicalDocumentRequest>,
) -> Result<(StatusCode, Json<MedicalDocumentRecord>), (StatusCode, String)> {
    info!(document_id = %payload.id, student_id = %payload.student_id, "Create medical document request received");

    if payload.id.trim().is_empty()
        || payload.student_id.trim().is_empty()
        || payload.document_type.trim().is_empty()
        || payload.document_date.trim().is_empty()
        || payload.file_name.trim().is_empty()
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "Document ID, student ID, type, date, and file name are required".to_string(),
        ));
    }

    let result = sqlx::query_as::<_, MedicalDocumentRecord>(
        r#"
        INSERT INTO medical_documents (id, student_id, student_name, year_level, program, document_type, document_date, file_name, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9)
        RETURNING id, student_id, student_name, year_level, program, document_type,
                  document_date::text as document_date, file_name, remarks,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.student_id)
    .bind(&payload.student_name)
    .bind(&payload.year_level)
    .bind(&payload.program)
    .bind(&payload.document_type)
    .bind(&payload.document_date)
    .bind(&payload.file_name)
    .bind(&payload.remarks)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(document_id = %payload.id, error = ?e, "Create medical document insert failed");
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))
    })?;

    info!(document_id = %result.id, "Create medical document insert completed");
    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_medical_documents(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<MedicalDocumentRecord>>, (StatusCode, String)> {
    let records = sqlx::query_as::<_, MedicalDocumentRecord>(
        r#"
        SELECT id, student_id, student_name, year_level, program, document_type,
               document_date::text as document_date, file_name, remarks,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM medical_documents
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", e),
        )
    })?;

    Ok(Json(records))
}

pub async fn delete_medical_document(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM medical_documents WHERE id = $1")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            )
        })?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            "Medical document not found".to_string(),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}
