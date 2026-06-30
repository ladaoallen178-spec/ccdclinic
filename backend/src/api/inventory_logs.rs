use axum::{extract::Extension, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tracing::{error, info};

use crate::api::auth::AppState;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct InventoryLogRecord {
    pub id: String,
    pub date_time: Option<String>,
    pub medicine: Option<String>,
    pub action: String,
    pub qty: Option<i32>,
    pub student_id: Option<String>,
    pub student_name: Option<String>,
    pub staff_id: Option<String>,
    pub staff_name: Option<String>,
    pub performed_by: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInventoryLogRequest {
    pub id: String,
    pub date_time: Option<String>,
    pub medicine: Option<String>,
    pub action: String,
    pub qty: Option<i32>,
    pub student_id: Option<String>,
    pub student_name: Option<String>,
    pub staff_id: Option<String>,
    pub staff_name: Option<String>,
    pub performed_by: Option<String>,
    pub notes: Option<String>,
}

pub async fn create_inventory_log(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateInventoryLogRequest>,
) -> Result<(StatusCode, Json<InventoryLogRecord>), (StatusCode, String)> {
    info!(log_id = %payload.id, action = %payload.action, "Create inventory log request received");

    if payload.id.trim().is_empty() || payload.action.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Log ID and action are required".to_string(),
        ));
    }

    let result = sqlx::query_as::<_, InventoryLogRecord>(
        r#"
        INSERT INTO inventory_logs (id, date_time, medicine, action, qty, student_id, student_name, staff_id, staff_name, performed_by, notes)
        VALUES ($1, COALESCE($2::timestamptz, NOW()), $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, to_char(date_time, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as date_time, medicine, action, qty,
                  student_id, student_name, staff_id, staff_name, performed_by, notes
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.date_time)
    .bind(&payload.medicine)
    .bind(&payload.action)
    .bind(payload.qty)
    .bind(&payload.student_id)
    .bind(&payload.student_name)
    .bind(&payload.staff_id)
    .bind(&payload.staff_name)
    .bind(&payload.performed_by)
    .bind(&payload.notes)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(log_id = %payload.id, error = ?e, "Create inventory log insert failed");
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))
    })?;

    info!(log_id = %result.id, "Create inventory log insert completed");
    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_inventory_logs(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<InventoryLogRecord>>, (StatusCode, String)> {
    let records = sqlx::query_as::<_, InventoryLogRecord>(
        r#"
        SELECT id, to_char(date_time, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as date_time, medicine, action, qty,
               student_id, student_name, staff_id, staff_name, performed_by, notes
        FROM inventory_logs
        ORDER BY date_time DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(Json(records))
}
