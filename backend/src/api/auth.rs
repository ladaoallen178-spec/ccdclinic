use argon2::{
    password_hash::{
        Error as PasswordHashError, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
    },
    Argon2,
};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};
use std::env;
use tracing::{info, warn};
use uuid::Uuid;

// Requires a PostgreSQL users table such as:
//
// CREATE TABLE users (
//     id UUID PRIMARY KEY,
//     email TEXT NOT NULL UNIQUE,
//     full_name TEXT,
//     role TEXT NOT NULL DEFAULT 'Nurse',
//     password_hash TEXT NOT NULL,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
// );

#[derive(Clone)]
pub struct AppState {
    pub db: Option<PgPool>,
    pub jwt_secret: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub contact_number: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub fullname: Option<String>,
    pub role: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: Uuid,
    email: String,
    exp: usize,
    iat: usize,
}

#[derive(Deserialize, FromRow)]
struct UserRecord {
    id: Uuid,
    email: String,
    full_name: Option<String>,
    role: String,
    password_hash: String,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    let email = payload.email.trim().to_lowercase();
    let password = payload.password.trim();
    let full_name = payload.full_name.and_then(|name| {
        let trimmed = name.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });
    let contact_number = payload.contact_number.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    if email.is_empty() || password.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Email and password are required.");
    }

    let password_hash = match hash_password(password) {
        Ok(hash) => hash,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to hash password.",
            )
        }
    };

    let user_id = Uuid::new_v4();
    let role = payload.role.unwrap_or_else(|| "Nurse".to_string());
    let local_result = match state.db.as_ref() {
        Some(db) => Some(
            sqlx::query(
                r#"INSERT INTO users (id, email, full_name, role, password_hash, contact_number, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, now())"#,
            )
            .bind(user_id)
            .bind(&email)
            .bind(&full_name)
            .bind(&role)
            .bind(&password_hash)
            .bind(&contact_number)
            .execute(db)
            .await,
        ),
        None => None,
    };

    if let Some(Err(err)) = local_result.as_ref() {
        if let Some(db_err) = err.as_database_error() {
            let message = db_err.message();
            if message.contains("unique") || message.contains("duplicate") {
                return error_response(StatusCode::CONFLICT, "Email already exists.");
            }
        }
        warn!(email = %email, error = %err, "Local registration failed; trying Supabase REST fallback");
    }

    if !matches!(local_result, Some(Ok(_))) {
        if let Err(err) = create_user_in_supabase(
            user_id,
            &email,
            full_name.as_deref(),
            &role,
            &password_hash,
            contact_number.as_deref(),
        )
        .await
        {
            let message = err.to_string();
            if message.contains("409") || message.to_lowercase().contains("duplicate") {
                return error_response(StatusCode::CONFLICT, "Email already exists.");
            }
            warn!(email = %email, error = %err, "Supabase REST registration failed");
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "Unable to register user.");
        }
    }

    match create_token(&state.jwt_secret, user_id, &email).await {
        Ok(token) => {
            let response = AuthResponse {
                token,
                user: UserResponse {
                    id: user_id,
                    email: email.clone(),
                    fullname: full_name.clone(),
                    role: role.clone(),
                },
            };
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(_) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to generate auth token.",
        ),
    }
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let email = payload.email.trim().to_lowercase();
    let password = payload.password.trim();

    info!(email = %email, "Received login request");

    if email.is_empty() || password.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Email and password are required.");
    }

    let row = match state.db.as_ref() {
        Some(db) => match fetch_user_by_email(db, &email).await {
            Ok(Some(row)) => row,
            Ok(None) => match fetch_user_by_email_from_supabase(&email).await {
                Ok(Some(row)) => {
                    info!(email = %email, "Login succeeded via Supabase fallback. Caching user locally.");
                    if let Err(err) = cache_remote_user_locally(db, &row).await {
                        warn!(email = %email, error = %err, "Unable to cache Supabase user locally");
                    }
                    row
                }
                Ok(None) => {
                    info!(email = %email, "Login failed: user not found locally or in Supabase fallback");
                    return error_response(StatusCode::UNAUTHORIZED, "Invalid email or password.");
                }
                Err(rest_err) => {
                    info!(email = %email, error = %rest_err, "Login failed: Supabase REST fallback error");
                    return error_response(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Unable to query user.",
                    );
                }
            },
            Err(err) => {
                info!(email = %email, error = %err, "Login failed: DB query error");
                match fetch_user_by_email_from_supabase(&email).await {
                    Ok(Some(row)) => row,
                    Ok(None) => {
                        info!(email = %email, "Login failed: user not found in Supabase REST fallback");
                        return error_response(StatusCode::UNAUTHORIZED, "Invalid email or password.");
                    }
                    Err(rest_err) => {
                        info!(email = %email, error = %rest_err, "Login failed: Supabase REST fallback error");
                        return error_response(
                            StatusCode::INTERNAL_SERVER_ERROR,
                            "Unable to query user.",
                        );
                    }
                }
            }
        },
        None => match fetch_user_by_email_from_supabase(&email).await {
            Ok(Some(row)) => row,
            Ok(None) => {
                info!(email = %email, "Login failed: user not found in Supabase REST fallback");
                return error_response(StatusCode::UNAUTHORIZED, "Invalid email or password.");
            }
            Err(rest_err) => {
                info!(email = %email, error = %rest_err, "Login failed: Supabase REST fallback error");
                return error_response(StatusCode::INTERNAL_SERVER_ERROR, "Unable to query user.");
            }
        },
    };

    let needs_rehash = match verify_password(password, &row.password_hash) {
        PasswordVerification::Valid => false,
        PasswordVerification::ValidNeedsRehash => true,
        PasswordVerification::Invalid => {
            info!(email = %email, "Login failed: invalid password");
            return error_response(StatusCode::UNAUTHORIZED, "Invalid email or password.");
        }
    };

    if needs_rehash {
        match hash_password(password) {
            Ok(password_hash) => {
                let local_update = match state.db.as_ref() {
                    Some(db) => Some(
                        sqlx::query(r#"UPDATE users SET password_hash = $1 WHERE id = $2"#)
                        .bind(&password_hash)
                        .bind(row.id)
                        .execute(db)
                        .await,
                    ),
                    None => None,
                };

                let should_update_supabase = match local_update {
                    Some(Ok(_)) => false,
                    Some(Err(err)) => {
                        warn!(email = %email, error = %err, "Unable to upgrade plaintext password hash");
                        true
                    }
                    None => true,
                };

                if should_update_supabase {
                    if let Err(rest_err) = update_password_hash_in_supabase(row.id, &password_hash).await {
                        warn!(email = %email, error = %rest_err, "Unable to upgrade plaintext password hash via Supabase REST fallback");
                    }
                }
            }
            Err(err) => {
                warn!(email = %email, error = %err, "Unable to hash plaintext password for upgrade")
            }
        }
    }

    let user_id = row.id;
    let full_name = row.full_name;
    let role = row.role;
    let email = row.email;
    match create_token(&state.jwt_secret, user_id, &email).await {
        Ok(token) => {
            let response = AuthResponse {
                token,
                user: UserResponse {
                    id: user_id,
                    email: email.clone(),
                    fullname: full_name.clone(),
                    role,
                },
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(_) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to generate auth token.",
        ),
    }
}

async fn create_token(
    secret: &str,
    user_id: Uuid,
    email: &str,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let exp = now + Duration::hours(24);
    let claims = Claims {
        sub: user_id,
        email: email.to_string(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

async fn fetch_user_by_email(db: &PgPool, email: &str) -> Result<Option<UserRecord>, sqlx::Error> {
    sqlx::query_as::<_, UserRecord>(
        r#"SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1"#,
    )
    .bind(email)
    .fetch_optional(db)
    .await
}

async fn fetch_user_by_email_from_supabase(email: &str) -> anyhow::Result<Option<UserRecord>> {
    let supabase_url = env::var("SUPABASE_URL")?;
    let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY")?;
    let url = format!("{}/rest/v1/users", supabase_url.trim_end_matches('/'));

    let response = reqwest::Client::new()
        .get(url)
        .header("apikey", &service_key)
        .bearer_auth(&service_key)
        .query(&[
            ("email", format!("eq.{}", email)),
            (
                "select",
                "id,email,full_name,role,password_hash".to_string(),
            ),
            ("limit", "1".to_string()),
        ])
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        return Err(anyhow::anyhow!("Supabase REST returned {}", status));
    }

    let mut users = response.json::<Vec<UserRecord>>().await?;
    Ok(users.pop())
}

async fn create_user_in_supabase(
    user_id: Uuid,
    email: &str,
    full_name: Option<&str>,
    role: &str,
    password_hash: &str,
    contact_number: Option<&str>,
) -> anyhow::Result<()> {
    let supabase_url = env::var("SUPABASE_URL")?;
    let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY")?;
    let url = format!("{}/rest/v1/users", supabase_url.trim_end_matches('/'));

    let response = reqwest::Client::new()
        .post(url)
        .header("apikey", &service_key)
        .bearer_auth(&service_key)
        .header("Prefer", "return=minimal")
        .json(&json!({
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "password_hash": password_hash,
            "contact_number": contact_number,
        }))
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        return Err(anyhow::anyhow!("Supabase REST returned {}", status));
    }

    Ok(())
}

async fn cache_remote_user_locally(db: &PgPool, user: &UserRecord) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO users (id, email, full_name, role, password_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (id) DO UPDATE
           SET email = EXCLUDED.email,
               full_name = EXCLUDED.full_name,
               role = EXCLUDED.role,
               password_hash = EXCLUDED.password_hash"#,
    )
    .bind(user.id)
    .bind(&user.email)
    .bind(&user.full_name)
    .bind(&user.role)
    .bind(&user.password_hash)
    .execute(db)
    .await
    .map(|_| ())
}

async fn update_password_hash_in_supabase(
    user_id: Uuid,
    password_hash: &str,
) -> anyhow::Result<()> {
    let supabase_url = env::var("SUPABASE_URL")?;
    let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY")?;
    let url = format!("{}/rest/v1/users", supabase_url.trim_end_matches('/'));

    let response = reqwest::Client::new()
        .patch(url)
        .header("apikey", &service_key)
        .bearer_auth(&service_key)
        .header("Prefer", "return=minimal")
        .query(&[("id", format!("eq.{}", user_id))])
        .json(&json!({ "password_hash": password_hash }))
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        return Err(anyhow::anyhow!("Supabase REST returned {}", status));
    }

    Ok(())
}

enum PasswordVerification {
    Valid,
    ValidNeedsRehash,
    Invalid,
}

fn hash_password(password: &str) -> Result<String, PasswordHashError> {
    let salt = SaltString::generate(&mut thread_rng());
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
}

fn verify_password(password: &str, stored_password: &str) -> PasswordVerification {
    match PasswordHash::new(stored_password) {
        Ok(password_hash) => {
            if Argon2::default()
                .verify_password(password.as_bytes(), &password_hash)
                .is_ok()
            {
                PasswordVerification::Valid
            } else {
                PasswordVerification::Invalid
            }
        }
        Err(_) if stored_password == password => PasswordVerification::ValidNeedsRehash,
        Err(_) => PasswordVerification::Invalid,
    }
}

fn error_response(status: StatusCode, message: &'static str) -> Response {
    (
        status,
        Json(json!({
            "error": message,
        })),
    )
        .into_response()
}
