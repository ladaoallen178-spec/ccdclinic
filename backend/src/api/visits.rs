use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tracing::{error, info};
use uuid::Uuid;

use crate::api::auth::AppState;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct VisitRecord {
    pub id: String,
    pub patient_type: String,
    pub student_id: Option<String>,
    pub staff_id: Option<String>,
    pub temperature: Option<String>,
    pub blood_pressure: Option<String>,
    pub referred_to_hospital: bool,
    pub reason_for_visit: String,
    pub medicine_given: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVisitRequest {
    pub patient_type: String,
    pub student_id: Option<String>,
    pub staff_id: Option<String>,
    pub temperature: Option<String>,
    pub blood_pressure: Option<String>,
    pub referred_to_hospital: Option<bool>,
    pub reason_for_visit: String,
    pub medicine_given: Option<String>,
    pub status: Option<String>,
}

pub async fn create_visit(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateVisitRequest>,
) -> Result<(StatusCode, Json<VisitRecord>), (StatusCode, String)> {
    let id = Uuid::new_v4();
    let referred = payload.referred_to_hospital.unwrap_or(false);
    let status = payload
        .status
        .unwrap_or_else(|| if referred { "Referred" } else { "Pending" }.to_string());

    info!(
        visit_id = %id,
        patient_type = %payload.patient_type,
        student_id = ?payload.student_id,
        staff_id = ?payload.staff_id,
        status = %status,
        "Create visit request received"
    );

    // Validate patient reference
    if payload.patient_type == "Student" && payload.student_id.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Student ID required for Student visits".to_string(),
        ));
    }
    if payload.patient_type == "Staff" && payload.staff_id.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Staff ID required for Staff visits".to_string(),
        ));
    }

    let result = sqlx::query_as::<_, VisitRecord>(
        r#"
        INSERT INTO visits (id, patient_type, student_id, staff_id, temperature, blood_pressure, 
                           referred_to_hospital, reason_for_visit, medicine_given, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id::text as id, patient_type, student_id, staff_id, temperature, blood_pressure, 
                  referred_to_hospital, reason_for_visit, medicine_given, status,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(id)
    .bind(&payload.patient_type)
    .bind(&payload.student_id)
    .bind(&payload.staff_id)
    .bind(&payload.temperature)
    .bind(&payload.blood_pressure)
    .bind(referred)
    .bind(&payload.reason_for_visit)
    .bind(&payload.medicine_given)
    .bind(&status)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(visit_id = %id, error = ?e, "Create visit insert failed");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", e),
        )
    })?;

    info!(visit_id = %result.id, "Create visit insert completed");
    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_visits(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<VisitRecord>>, (StatusCode, String)> {
    let visits = sqlx::query_as::<_, VisitRecord>(
        r#"
        SELECT id::text as id, patient_type, student_id, staff_id, temperature, blood_pressure, 
               referred_to_hospital, reason_for_visit, medicine_given, status,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM visits
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

    Ok(Json(visits))
}

pub async fn get_visit(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<Json<VisitRecord>, (StatusCode, String)> {
    let visit = sqlx::query_as::<_, VisitRecord>(
        r#"
        SELECT id::text as id, patient_type, student_id, staff_id, temperature, blood_pressure, 
               referred_to_hospital, reason_for_visit, medicine_given, status,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM visits
        WHERE id = $1
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", e),
        )
    })?
    .ok_or((StatusCode::NOT_FOUND, "Visit not found".to_string()))?;

    Ok(Json(visit))
}

pub async fn delete_visit(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM visits WHERE id = $1")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            )
        })?;

    Ok(StatusCode::NO_CONTENT)
}
