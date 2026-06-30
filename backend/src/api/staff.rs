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
pub struct StaffRecord {
    pub id: String,
    pub name: String,
    pub department: Option<String>,
    pub concern: Option<String>,
    pub status: String,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub staff_type: Option<String>,
    pub position: Option<String>,
    pub contact_number: Option<String>,
    pub email: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStaffRequest {
    pub id: String,
    pub name: String,
    pub department: Option<String>,
    pub concern: Option<String>,
    pub status: Option<String>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub staff_type: Option<String>,
    pub position: Option<String>,
    pub contact_number: Option<String>,
    pub email: Option<String>,
}

pub async fn create_staff(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateStaffRequest>,
) -> Result<(StatusCode, Json<StaffRecord>), (StatusCode, String)> {
    let id = payload.id.trim();
    let name = payload.name.trim();
    let status = payload.status.unwrap_or_else(|| "Cleared".to_string());

    info!(staff_id = %id, name = %name, status = %status, "Create staff request received");

    if id.is_empty() || name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Staff ID and name are required".to_string(),
        ));
    }

    let result = sqlx::query_as::<_, StaffRecord>(
        r#"
        INSERT INTO staff (id, name, department, concern, status, age, gender, staff_type, position, contact_number, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            concern = EXCLUDED.concern,
            status = EXCLUDED.status,
            age = EXCLUDED.age,
            gender = EXCLUDED.gender,
            staff_type = EXCLUDED.staff_type,
            position = EXCLUDED.position,
            contact_number = EXCLUDED.contact_number,
            email = EXCLUDED.email
        RETURNING id, name, department, concern, status, age, gender, staff_type, position, contact_number, email,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(&payload.department)
    .bind(&payload.concern)
    .bind(&status)
    .bind(payload.age)
    .bind(&payload.gender)
    .bind(&payload.staff_type)
    .bind(&payload.position)
    .bind(&payload.contact_number)
    .bind(&payload.email)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(staff_id = %id, error = ?e, "Create staff insert failed");
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))
    })?;

    info!(staff_id = %result.id, "Create staff insert completed");
    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_staff(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<StaffRecord>>, (StatusCode, String)> {
    let staff = sqlx::query_as::<_, StaffRecord>(
        r#"
        SELECT id, name, department, concern, status, age, gender, staff_type, position, contact_number, email,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM staff
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(Json(staff))
}

pub async fn get_staff_member(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<Json<StaffRecord>, (StatusCode, String)> {
    let staff = sqlx::query_as::<_, StaffRecord>(
        r#"
        SELECT id, name, department, concern, status, age, gender, staff_type, position, contact_number, email,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM staff
        WHERE id = $1
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Staff member not found".to_string()))?;

    Ok(Json(staff))
}

pub async fn delete_staff(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM staff WHERE id = $1")
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
        return Err((StatusCode::NOT_FOUND, "Staff member not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
