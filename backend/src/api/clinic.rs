use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::FromRow;
use std::env;
use reqwest::{Client, Url};
use anyhow::{anyhow, Result as AnyResult};

use crate::api::auth::AppState;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisitRecord {
    pub id: Option<String>,
    pub patient_type: String,
    pub id_number: String,
    pub temperature: Option<String>,
    pub blood_pressure: Option<String>,
    pub referred_to_hospital: bool,
    pub reason_for_visit: String,
    pub medicine_given: Option<String>,
    pub status: String,
    pub created_at: Option<DateTime<Utc>>,
    pub patient_name: Option<String>,
    pub year_program: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
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
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryLog {
    pub id: String,
    pub date_time: Option<DateTime<Utc>>,
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

#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BmiRecord {
    pub id: String,
    pub student_id: String,
    pub student_name: Option<String>,
    pub height: f64,
    pub weight: f64,
    pub bmi: f64,
    pub status: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
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
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct NurseRecord {
    pub id: String,
    pub name: Option<String>,
    pub email: String,
    pub role: String,
    pub contact_number: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

pub async fn list_students(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<StudentRecord>>("students", Some(&[("select", "*"), ("order", "created_at.desc,name.asc")])).await {
        Ok(rows) => (StatusCode::OK, Json(rows)).into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn upsert_student(
    State(_state): State<AppState>,
    Json(payload): Json<StudentRecord>,
) -> impl IntoResponse {
    let status = if payload.status.trim().is_empty() {
        "Cleared".to_string()
    } else {
        payload.status.clone()
    };

    let body = json!({
        "id": payload.id,
        "name": payload.name,
        "section": payload.section,
        "concern": payload.concern,
        "status": status,
        "age": payload.age,
        "gender": payload.gender,
        "year_level": payload.year_level,
        "program": payload.program,
        "parent_name": payload.parent_name,
        "parent_phone": payload.parent_phone,
    });

    match supabase_post::<Vec<StudentRecord>>("students", Some(&[("on_conflict", "id")]), &body, Some("resolution=merge-duplicates,return=representation")).await {
        Ok(mut rows) => match rows.pop() {
            Some(row) => (StatusCode::CREATED, Json(row)).into_response(),
            None => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, "Supabase returned no student record.".to_string()),
        },
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn delete_student(State(_state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match supabase_delete("students", "id", format!("eq.{}", id).as_str()).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn list_staff(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<StaffRecord>>("staff", Some(&[("select", "*"), ("order", "created_at.desc,name.asc")])).await {
        Ok(rows) => (StatusCode::OK, Json(rows)).into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn upsert_staff(
    State(_state): State<AppState>,
    Json(payload): Json<StaffRecord>,
) -> impl IntoResponse {
    let status = if payload.status.trim().is_empty() {
        "Cleared".to_string()
    } else {
        payload.status.clone()
    };

    let body = json!({
        "id": payload.id,
        "name": payload.name,
        "department": payload.department,
        "concern": payload.concern,
        "status": status,
        "age": payload.age,
        "gender": payload.gender,
        "staff_type": payload.staff_type,
        "position": payload.position,
        "contact_number": payload.contact_number,
        "email": payload.email,
    });

    match supabase_post::<Vec<StaffRecord>>("staff", Some(&[("on_conflict", "id")]), &body, Some("resolution=merge-duplicates,return=representation")).await {
        Ok(mut rows) => match rows.pop() {
            Some(row) => (StatusCode::CREATED, Json(row)).into_response(),
            None => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, "Supabase returned no staff record.".to_string()),
        },
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn delete_staff(State(_state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match supabase_delete("staff", "id", format!("eq.{}", id).as_str()).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn list_visits(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<Value>>("visits", Some(&[
        (
            "select",
            "id,patient_type,student_id,staff_id,temperature,blood_pressure,referred_to_hospital,reason_for_visit,medicine_given,status,created_at,student:students(id,name,section,year_level,program),staff:staff(id,name)",
        ),
        ("order", "created_at.desc"),
    ])).await {
        Ok(rows) => {
            let visits: Vec<VisitRecord> = rows.into_iter().map(convert_supabase_visit).collect();
            (StatusCode::OK, Json(visits)).into_response()
        }
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn create_visit(State(_state): State<AppState>, Json(payload): Json<VisitRecord>) -> impl IntoResponse {
    let is_student = payload.patient_type.eq_ignore_ascii_case("student");

    if let Err(err) = ensure_patient_supabase(
        is_student,
        &payload.id_number,
        payload.patient_name.as_deref(),
        &payload.reason_for_visit,
    )
    .await
    {
        return error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string());
    }

    let mut body = serde_json::Map::new();
    body.insert("patient_type".to_string(), Value::String(payload.patient_type.clone()));
    if is_student {
        body.insert("student_id".to_string(), Value::String(payload.id_number.clone()));
    } else {
        body.insert("staff_id".to_string(), Value::String(payload.id_number.clone()));
    }
    if let Some(t) = &payload.temperature {
        body.insert("temperature".to_string(), Value::String(t.clone()));
    }
    if let Some(bp) = &payload.blood_pressure {
        body.insert("blood_pressure".to_string(), Value::String(bp.clone()));
    }
    body.insert(
        "referred_to_hospital".to_string(),
        Value::Bool(payload.referred_to_hospital),
    );
    body.insert(
        "reason_for_visit".to_string(),
        Value::String(payload.reason_for_visit.clone()),
    );
    if let Some(m) = &payload.medicine_given {
        body.insert("medicine_given".to_string(), Value::String(m.clone()));
    }
    body.insert(
        "status".to_string(),
        Value::String(if payload.status.trim().is_empty() {
            "Pending".to_string()
        } else {
            payload.status.clone()
        }),
    );
    if let Some(created_at) = &payload.created_at {
        body.insert(
            "created_at".to_string(),
            Value::String(created_at.to_rfc3339()),
        );
    }

    match supabase_post::<Vec<Value>>("visits", None, &Value::Object(body), Some("return=representation")).await {
        Ok(mut rows) => match rows.pop() {
            Some(row) => {
                let visit = convert_supabase_visit(row);
                (StatusCode::CREATED, Json(visit)).into_response()
            }
            None => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, "Supabase returned no visit record.".to_string()),
        },
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

async fn ensure_patient_supabase(
    is_student: bool,
    id: &str,
    patient_name: Option<&str>,
    reason_for_visit: &str,
) -> AnyResult<()> {
    let name = patient_name
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(id)
        .trim()
        .to_string();
    let concern = reason_for_visit.trim().to_string();
    let body = json!({
        "id": id,
        "name": name,
        "concern": concern,
        "status": "Pending",
    });

    let table = if is_student { "students" } else { "staff" };
    let _ = supabase_post::<Vec<Value>>(table, Some(&[("on_conflict", "id")]), &body, Some("resolution=merge-duplicates,return=representation")).await?;
    Ok(())
}

async fn supabase_get<T>(
    table: &str,
    query: Option<&[(&str, &str)]>,
) -> AnyResult<T>
where
    T: DeserializeOwned,
{
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| anyhow!("Missing SUPABASE_URL"))?;
    let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY").map_err(|_| anyhow!("Missing SUPABASE_SERVICE_ROLE_KEY"))?;
    let client = Client::new();
    let mut url = Url::parse(&format!("{}/rest/v1/{}", supabase_url.trim_end_matches('/'), table))?;

    if let Some(params) = query {
        for (key, value) in params {
            url.query_pairs_mut().append_pair(key, value);
        }
    }

    let resp = client
        .get(url)
        .header("apikey", &service_key)
        .bearer_auth(&service_key)
        .header("Accept", "application/json")
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(anyhow!("Supabase GET failed with status {}", resp.status()));
    }

    let parsed = resp.json::<T>().await?;
    Ok(parsed)
}

async fn supabase_post<T>(
    table: &str,
    query: Option<&[(&str, &str)]>,
    body: &Value,
    prefer: Option<&str>,
) -> AnyResult<T>
where
    T: DeserializeOwned,
{
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| anyhow!("Missing SUPABASE_URL"))?;
    let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY").map_err(|_| anyhow!("Missing SUPABASE_SERVICE_ROLE_KEY"))?;
    let client = Client::new();
    let mut url = Url::parse(&format!("{}/rest/v1/{}", supabase_url.trim_end_matches('/'), table))?;

    if let Some(params) = query {
        for (key, value) in params {
            url.query_pairs_mut().append_pair(key, value);
        }
    }

    let mut builder = client
        .post(url)
        .header("apikey", &service_key)
        .bearer_auth(&service_key)
        .header("Accept", "application/json");

    if let Some(prefer_value) = prefer {
        builder = builder.header("Prefer", prefer_value);
    }

    let resp = builder.json(body).send().await?;
    if !resp.status().is_success() {
        return Err(anyhow!("Supabase POST failed with status {}", resp.status()));
    }

    let parsed = resp.json::<T>().await?;
    Ok(parsed)
}

async fn supabase_delete(table: &str, field: &str, predicate: &str) -> AnyResult<()> {
    let supabase_url = env::var("SUPABASE_URL").map_err(|_| anyhow!("Missing SUPABASE_URL"))?;
    let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY").map_err(|_| anyhow!("Missing SUPABASE_SERVICE_ROLE_KEY"))?;
    let mut url = Url::parse(&format!("{}/rest/v1/{}", supabase_url.trim_end_matches('/'), table))?;
    url.query_pairs_mut().append_pair(field, predicate);

    let client = Client::new();
    let resp = client
        .delete(url)
        .header("apikey", &service_key)
        .bearer_auth(&service_key)
        .header("Accept", "application/json")
        .send()
        .await?;

    if resp.status().is_success() {
        Ok(())
    } else {
        Err(anyhow!("Supabase DELETE failed with status {}", resp.status()))
    }
}

fn convert_supabase_visit(row: Value) -> VisitRecord {
    let patient_type = row
        .get("patient_type")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    let id_number = row
        .get("student_id")
        .and_then(|value| value.as_str())
        .map(str::to_string)
        .or_else(|| row.get("staff_id").and_then(|value| value.as_str()).map(str::to_string))
        .unwrap_or_default();
    let temperature = row
        .get("temperature")
        .and_then(|value| value.as_str())
        .map(str::to_string);
    let blood_pressure = row
        .get("blood_pressure")
        .and_then(|value| value.as_str())
        .map(str::to_string);
    let referred_to_hospital = row
        .get("referred_to_hospital")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let reason_for_visit = row
        .get("reason_for_visit")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    let medicine_given = row
        .get("medicine_given")
        .and_then(|value| value.as_str())
        .map(str::to_string);
    let status = row
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string();
    let created_at = row
        .get("created_at")
        .and_then(|value| value.as_str())
        .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let patient_name = match patient_type.to_lowercase().as_str() {
        "student" => extract_nested_string(&row, "student", "name"),
        _ => extract_nested_string(&row, "staff", "name"),
    };
    let year_program = extract_student_year_program(&row);

    VisitRecord {
        id: row.get("id").and_then(|value| value.as_str()).map(str::to_string),
        patient_type,
        id_number,
        temperature,
        blood_pressure,
        referred_to_hospital,
        reason_for_visit,
        medicine_given,
        status,
        created_at,
        patient_name,
        year_program,
    }
}

fn extract_nested_string(row: &Value, relation: &str, field: &str) -> Option<String> {
    row.get(relation)
        .and_then(|value| value.as_array())
        .and_then(|array| array.get(0))
        .and_then(|nested| nested.get(field))
        .and_then(|value| value.as_str())
        .map(str::to_string)
}

fn extract_student_year_program(row: &Value) -> Option<String> {
    row.get("student")
        .and_then(|value| value.as_array())
        .and_then(|array| array.get(0))
        .and_then(|student| {
            let year_level = student
                .get("year_level")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            let program = student
                .get("program")
                .and_then(|value| value.as_str())
                .unwrap_or("");

            let parts: Vec<&str> = [year_level, program]
                .into_iter()
                .filter(|part| !part.is_empty())
                .collect();

            if parts.is_empty() {
                None
            } else {
                Some(parts.join("/"))
            }
        })
}

fn error_response_message(status: StatusCode, message: String) -> Response {
    (status, Json(json!({ "error": message }))).into_response()
}

pub async fn list_inventory(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<InventoryItem>>("inventory", Some(&[("select", "*"), ("order", "created_at.desc,name.asc")])).await {
        Ok(rows) => (StatusCode::OK, Json(rows)).into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn upsert_inventory(
    State(_state): State<AppState>,
    Json(payload): Json<InventoryItem>,
) -> impl IntoResponse {
    let body = json!({
        "id": payload.id,
        "name": payload.name,
        "dosage": payload.dosage,
        "stock": payload.stock,
        "unit": payload.unit,
        "status": if payload.status.trim().is_empty() { "Available" } else { payload.status.as_str() },
        "expiry": payload.expiry,
        "supplier": payload.supplier,
        "location": payload.location,
        "remarks": payload.remarks,
        "keywords": payload.keywords,
    });

    match supabase_post::<Vec<InventoryItem>>("inventory", Some(&[("on_conflict", "id")]), &body, Some("resolution=merge-duplicates,return=representation")).await {
        Ok(mut rows) => match rows.pop() {
            Some(row) => (StatusCode::CREATED, Json(row)).into_response(),
            None => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, "Supabase returned no inventory record.".to_string()),
        },
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn delete_inventory(State(_state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match supabase_delete("inventory", "id", format!("eq.{}", id).as_str()).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn list_inventory_logs(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<InventoryLog>>("inventory_logs", Some(&[("select", "*"), ("order", "date_time.desc")])).await {
        Ok(rows) => (StatusCode::OK, Json(rows)).into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn create_inventory_log(
    State(_state): State<AppState>,
    Json(payload): Json<InventoryLog>,
) -> impl IntoResponse {
    let mut body = json!({
        "id": payload.id,
        "medicine": payload.medicine,
        "action": payload.action,
        "qty": payload.qty,
        "student_id": payload.student_id,
        "student_name": payload.student_name,
        "staff_id": payload.staff_id,
        "staff_name": payload.staff_name,
        "performed_by": payload.performed_by,
        "notes": payload.notes,
    });

    if let Some(date_time) = payload.date_time {
        body.as_object_mut().unwrap().insert("date_time".to_string(), Value::String(date_time.to_rfc3339()));
    }

    match supabase_post::<Vec<InventoryLog>>("inventory_logs", None, &body, Some("return=representation")).await {
        Ok(mut rows) => match rows.pop() {
            Some(row) => (StatusCode::CREATED, Json(row)).into_response(),
            None => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, "Supabase returned no inventory log record.".to_string()),
        },
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn list_bmi_records(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<BmiRecord>>("bmi_records", Some(&[("select", "*"), ("order", "created_at.desc")])).await {
        Ok(rows) => (StatusCode::OK, Json(rows)).into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn create_bmi_record(State(_state): State<AppState>, Json(payload): Json<BmiRecord>) -> impl IntoResponse {
    let mut body = json!({
        "id": payload.id,
        "student_id": payload.student_id,
        "student_name": payload.student_name,
        "height": payload.height,
        "weight": payload.weight,
        "bmi": payload.bmi,
        "status": payload.status,
    });

    if let Some(created_at) = payload.created_at {
        body.as_object_mut().unwrap().insert("created_at".to_string(), Value::String(created_at.to_rfc3339()));
    }

    match supabase_post::<Vec<BmiRecord>>("bmi_records", None, &body, Some("return=representation")).await {
        Ok(mut rows) => match rows.pop() {
            Some(row) => (StatusCode::CREATED, Json(row)).into_response(),
            None => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, "Supabase returned no BMI record.".to_string()),
        },
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn list_medical_documents(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<MedicalDocumentRecord>>("medical_documents", Some(&[("select", "*"), ("order", "created_at.desc")])).await {
        Ok(rows) => (StatusCode::OK, Json(rows)).into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn create_medical_document(
    State(_state): State<AppState>,
    Json(payload): Json<MedicalDocumentRecord>,
) -> impl IntoResponse {
    let mut body = json!({
        "id": payload.id,
        "student_id": payload.student_id,
        "student_name": payload.student_name,
        "year_level": payload.year_level,
        "program": payload.program,
        "document_type": payload.document_type,
        "file_name": payload.file_name,
        "remarks": payload.remarks,
    });

    if !payload.document_date.trim().is_empty() {
        body.as_object_mut().unwrap().insert("document_date".to_string(), Value::String(payload.document_date.clone()));
    }
    if let Some(created_at) = payload.created_at {
        body.as_object_mut().unwrap().insert("created_at".to_string(), Value::String(created_at.to_rfc3339()));
    }

    match supabase_post::<Vec<MedicalDocumentRecord>>("medical_documents", None, &body, Some("return=representation")).await {
        Ok(mut rows) => match rows.pop() {
            Some(row) => (StatusCode::CREATED, Json(row)).into_response(),
            None => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, "Supabase returned no medical document record.".to_string()),
        },
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn delete_medical_document(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match supabase_delete("medical_documents", "id", format!("eq.{}", id).as_str()).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}

pub async fn list_nurses(State(_state): State<AppState>) -> impl IntoResponse {
    match supabase_get::<Vec<NurseRecord>>("users", Some(&[("select", "id,full_name,email,role,contact_number,created_at"), ("order", "created_at.desc")])).await {
        Ok(rows) => (StatusCode::OK, Json(rows)).into_response(),
        Err(err) => error_response_message(StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
    }
}
