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
pub struct InventoryRecord {
    pub id: String,
    pub name: String,
    pub dosage: Option<String>,
    pub stock: i32,
    pub unit: Option<String>,
    pub status: String,
    pub expiry: Option<String>,
    pub supplier: Option<String>,
    pub location: Option<String>,
    pub remarks: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInventoryRequest {
    pub id: Option<String>,
    pub name: String,
    pub dosage: Option<String>,
    pub stock: i32,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub expiry: Option<String>,
    pub supplier: Option<String>,
    pub location: Option<String>,
    pub remarks: Option<String>,
    pub keywords: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInventoryStockRequest {
    pub stock: i32,
}

pub async fn create_inventory(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateInventoryRequest>,
) -> Result<(StatusCode, Json<InventoryRecord>), (StatusCode, String)> {
    let id = payload
        .id
        .unwrap_or_else(|| format!("INV-{}", Uuid::new_v4().to_string()[0..8].to_uppercase()));
    let status = payload.status.unwrap_or_else(|| {
        if payload.stock > 0 {
            "In Stock".to_string()
        } else {
            "Out of Stock".to_string()
        }
    });

    info!(inventory_id = %id, name = %payload.name, stock = payload.stock, status = %status, "Create inventory request received");

    if payload.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Inventory name is required".to_string(),
        ));
    }

    let result = sqlx::query_as::<_, InventoryRecord>(
        r#"
        INSERT INTO inventory (id, name, dosage, stock, unit, status, expiry, supplier, location, remarks, keywords)
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11)
        ON CONFLICT (name) DO UPDATE SET
            dosage = EXCLUDED.dosage,
            stock = EXCLUDED.stock,
            unit = EXCLUDED.unit,
            status = EXCLUDED.status,
            expiry = EXCLUDED.expiry,
            supplier = EXCLUDED.supplier,
            location = EXCLUDED.location,
            remarks = EXCLUDED.remarks,
            keywords = EXCLUDED.keywords
        RETURNING id, name, dosage, stock, unit, status, expiry::text as expiry, supplier, location, remarks, keywords,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&payload.dosage)
    .bind(payload.stock)
    .bind(&payload.unit)
    .bind(&status)
    .bind(&payload.expiry)
    .bind(&payload.supplier)
    .bind(&payload.location)
    .bind(&payload.remarks)
    .bind(&payload.keywords)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(inventory_id = %id, error = ?e, "Create inventory insert failed");
        (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e))
    })?;

    info!(inventory_id = %result.id, name = %result.name, "Create inventory insert completed");
    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_inventory(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<InventoryRecord>>, (StatusCode, String)> {
    let items = sqlx::query_as::<_, InventoryRecord>(
        r#"
        SELECT id, name, dosage, stock, unit, status, expiry::text as expiry, supplier, location, remarks, keywords,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM inventory
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(Json(items))
}

pub async fn get_inventory_item(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<Json<InventoryRecord>, (StatusCode, String)> {
    let item = sqlx::query_as::<_, InventoryRecord>(
        r#"
        SELECT id, name, dosage, stock, unit, status, expiry::text as expiry, supplier, location, remarks, keywords,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM inventory
        WHERE id = $1
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Inventory item not found".to_string()))?;

    Ok(Json(item))
}

pub async fn update_inventory_stock(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateInventoryStockRequest>,
) -> Result<Json<InventoryRecord>, (StatusCode, String)> {
    let status = if payload.stock > 0 {
        "In Stock"
    } else {
        "Out of Stock"
    };

    let item = sqlx::query_as::<_, InventoryRecord>(
        r#"
        UPDATE inventory
        SET stock = $1, status = $2
        WHERE id = $3
        RETURNING id, name, dosage, stock, unit, status, expiry::text as expiry, supplier, location, remarks, keywords,
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(payload.stock)
    .bind(status)
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Inventory item not found".to_string()))?;

    Ok(Json(item))
}

pub async fn delete_inventory(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM inventory WHERE id = $1")
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
