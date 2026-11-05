use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tracing::{debug, error, info};
use uuid::Uuid;

use crate::api::auth::AppState;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct VisitRecord {
    pub id: String,
    pub patient_type: String,
    pub student_id: Option<String>,
    pub staff_id: Option<String>,
    pub patient_name: Option<String>,
    pub temperature: Option<String>,
    pub blood_pressure: Option<String>,
    pub referred_to_hospital: bool,
    pub reason_for_visit: String,
    pub medicine_given: Option<String>,
    pub status: String,
    pub visit_date: Option<String>,
    pub confirmed_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVisitRequest {
    pub patient_type: String,
    pub student_id: Option<String>,
    pub staff_id: Option<String>,
    pub patient_name: Option<String>,
    pub temperature: Option<String>,
    pub blood_pressure: Option<String>,
    pub referred_to_hospital: Option<bool>,
    pub reason_for_visit: String,
    pub medicine_given: Option<String>,
    pub status: Option<String>,
    pub visit_date: Option<String>,
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

    // Validate patient reference
    if payload.patient_type == "Student"
        && payload.student_id.is_none()
        && payload
            .patient_name
            .as_deref()
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .is_none()
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "Student visits must include either a registered student_id or a patient_name.".to_string(),
        ));
    }
    if payload.patient_type == "Staff" && payload.staff_id.is_none() {
        return Err((StatusCode::BAD_REQUEST, "Staff ID required for Staff visits".to_string()));
    }

    let result = sqlx::query_as::<_, VisitRecord>(
        r#"
        INSERT INTO visits (id, patient_type, student_id, staff_id, patient_name, temperature, blood_pressure,
                           referred_to_hospital, reason_for_visit, medicine_given, status, visit_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::timestamptz, NOW()))
        RETURNING id::text as id, patient_type, student_id, staff_id, patient_name, temperature, blood_pressure,
                  referred_to_hospital, reason_for_visit, medicine_given, status,
                  to_char(visit_date, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as visit_date,
                  confirmed_at::text as confirmed_at,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(id)
    .bind(&payload.patient_type)
    .bind(&payload.student_id)
    .bind(&payload.staff_id)
    .bind(&payload.patient_name)
    .bind(&payload.temperature)
    .bind(&payload.blood_pressure)
    .bind(referred)
    .bind(&payload.reason_for_visit)
    .bind(&payload.medicine_given)
    .bind(&status)
    .bind(&payload.visit_date)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_visits(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<VisitRecord>>, (StatusCode, String)> {
    let visits = sqlx::query_as::<_, VisitRecord>(
        r#"
        SELECT id::text as id, patient_type, student_id, staff_id, patient_name, temperature, blood_pressure,
               referred_to_hospital, reason_for_visit, medicine_given, status,
               to_char(visit_date, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as visit_date,
               to_char(confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as confirmed_at,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM visits
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(Json(visits))
}

pub async fn get_visit(
    Extension(state): Extension<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<VisitRecord>, (StatusCode, String)> {
    let visit = sqlx::query_as::<_, VisitRecord>(
        r#"
        SELECT id::text as id, patient_type, student_id, staff_id, patient_name, temperature, blood_pressure,
               referred_to_hospital, reason_for_visit, medicine_given, status,
               to_char(visit_date, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as visit_date,
               to_char(confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as confirmed_at,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM visits
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Visit not found".to_string()))?;

    Ok(Json(visit))
}

pub async fn confirm_visit(
    Extension(state): Extension<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<VisitRecord>, (StatusCode, String)> {
    info!(visit_id = %id, "Confirm visit request received");

    let visit = sqlx::query_as::<_, VisitRecord>(
        r#"
        UPDATE visits
        SET status = 'Confirmed', confirmed_at = NOW()
        WHERE id = $1
        RETURNING id::text as id, patient_type, student_id, staff_id, patient_name, temperature, blood_pressure,
                  referred_to_hospital, reason_for_visit, medicine_given, status,
                  to_char(visit_date, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as visit_date,
                  to_char(confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as confirmed_at,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(visit_id = %id, error = %e, "Failed to confirm visit");
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))
    })?;

    let visit = visit.ok_or_else(|| {
        let err = "Visit not found".to_string();
        error!(visit_id = %id, "{}", err);
        (StatusCode::NOT_FOUND, err)
    })?;

    info!(visit_id = %id, status = %visit.status, "Visit confirmed successfully");
    Ok(Json(visit))
}

pub async fn delete_visit(
    Extension(state): Extension<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM visits WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}
