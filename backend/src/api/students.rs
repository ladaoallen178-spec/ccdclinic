use axum::{
    extract::{Extension, Path},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::api::auth::AppState;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct StudentRecord {
    pub id: String,
    pub name: String,
    pub section: Option<String>,
    pub concern: Option<String>,
    pub status: String,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub year_level: Option<String>,
    pub program: Option<String>,
    pub parent_name: Option<String>,
    pub parent_phone: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStudentRequest {
    pub id: String,
    pub name: String,
    pub section: Option<String>,
    pub concern: Option<String>,
    pub status: Option<String>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub year_level: Option<String>,
    pub program: Option<String>,
    pub parent_name: Option<String>,
    pub parent_phone: Option<String>,
}

pub async fn create_student(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateStudentRequest>,
) -> Result<(StatusCode, Json<StudentRecord>), (StatusCode, String)> {
    let status = payload.status.unwrap_or_else(|| "Pending".to_string());

    let result = sqlx::query_as::<_, StudentRecord>(
        r#"
        INSERT INTO students (id, name, section, concern, status, age, gender, year_level, program, parent_name, parent_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            section = EXCLUDED.section,
            concern = EXCLUDED.concern,
            status = EXCLUDED.status,
            age = EXCLUDED.age,
            gender = EXCLUDED.gender,
            year_level = EXCLUDED.year_level,
            program = EXCLUDED.program,
            parent_name = EXCLUDED.parent_name,
            parent_phone = EXCLUDED.parent_phone
        RETURNING id, name, section, concern, status, age, gender, year_level, program, parent_name, parent_phone, 
                  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        "#,
    )
    .bind(&payload.id)
    .bind(&payload.name)
    .bind(&payload.section)
    .bind(&payload.concern)
    .bind(&status)
    .bind(payload.age)
    .bind(&payload.gender)
    .bind(&payload.year_level)
    .bind(&payload.program)
    .bind(&payload.parent_name)
    .bind(&payload.parent_phone)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_students(
    Extension(state): Extension<AppState>,
) -> Result<Json<Vec<StudentRecord>>, (StatusCode, String)> {
    let students = sqlx::query_as::<_, StudentRecord>(
        r#"
        SELECT id, name, section, concern, status, age, gender, year_level, program, parent_name, parent_phone,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM students
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(Json(students))
}

pub async fn get_student(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<Json<StudentRecord>, (StatusCode, String)> {
    let student = sqlx::query_as::<_, StudentRecord>(
        r#"
        SELECT id, name, section, concern, status, age, gender, year_level, program, parent_name, parent_phone,
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSTZ') as created_at
        FROM students
        WHERE id = $1
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
    .ok_or((StatusCode::NOT_FOUND, "Student not found".to_string()))?;

    Ok(Json(student))
}

pub async fn delete_student(
    Extension(state): Extension<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM students WHERE id = $1")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}
