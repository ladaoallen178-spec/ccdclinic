use axum::{extract::Extension, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tracing::{error, info};

use crate::api::auth::AppState;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct BmiRecord {
    pub id: String,
    pub student_id: String,
    pub student_name: Option<String>,
    pub height: f64,
    pub weight: f64,
    pub bmi: f64,
    pub status: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBmiRecordRequest {
    pub id: String,
    pub student_id: String,
    pub student_name: Option<String>,
    pub height: f64,
    pub weight: f64,
    pub bmi: f64,
    pub status: String,
}

pub async fn create_bmi_record(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateBmiRecordRequest>,
) -> Result<(StatusCode, Json<BmiRecord>), (StatusCode, String)> {
    info!(bmi_id = %payload.id, student_id = %payload.student_id, "Create BMI record request received");

    if payload.id.trim().is_empty()
        || payload.student_id.trim().is_empty()
        || payload.status.trim().is_empty()
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "BMI ID, student ID, and status are required".to_string(),
        ));
    }

    let result = sqlx::query_as::<_, BmiRecord>(
        r#"
        INSERT INTO bmi_records (id, student_id, student_name, height, weight, bmi, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, student_id, student_name, height::float8 as height, weight::float8 as weight,
                  bmi::float8 as bmi, status,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.student_id)
    .bind(&payload.student_name)
    .bind(payload.height)
    .bind(payload.weight)
    .bind(payload.bmi)
    .bind(&payload.status)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(bmi_id = %payload.id, error = ?e, "Create BMI insert failed");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", e),
        )
    })?;

    info!(bmi_id = %result.id, "Create BMI insert completed");
    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_bmi_records(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<BmiRecord>>, (StatusCode, String)> {
    let records = sqlx::query_as::<_, BmiRecord>(
        r#"
        SELECT id, student_id, student_name, height::float8 as height, weight::float8 as weight,
               bmi::float8 as bmi, status,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM bmi_records
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
