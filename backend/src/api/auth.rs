use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use tracing::{error, info};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};
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
    pub db: PgPool,
    pub jwt_secret: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
    pub role: Option<String>,
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

#[derive(FromRow)]
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
    let full_name = payload
        .full_name
        .and_then(|name| {
            let trimmed = name.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        });

    if email.is_empty() || password.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Email and password are required.");
    }

    let salt = SaltString::generate(&mut thread_rng());
    let password_hash = match Argon2::default().hash_password(password.as_bytes(), &salt) {
        Ok(hash) => hash.to_string(),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to hash password."),
    };

    let user_id = Uuid::new_v4();
    let role = payload.role.unwrap_or_else(|| "Nurse".to_string());
    let result = sqlx::query(
        r#"INSERT INTO users (id, email, full_name, role, password_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, now())"#,
    )
    .bind(user_id)
    .bind(&email)
    .bind(&full_name)
    .bind(&role)
    .bind(&password_hash)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => match create_token(&state.jwt_secret, user_id, &email).await {
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
            Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to generate auth token."),
        },
        Err(err) => {
            if let Some(db_err) = err.as_database_error() {
                let message = db_err.message();
                if message.contains("unique") || message.contains("duplicate") {
                    return error_response(StatusCode::CONFLICT, "Email already exists.");
                }
            }
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "Unable to register user.")
        }
    }
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let email = payload.email.trim().to_lowercase();
    let password = payload.password.trim();

    info!(email = %email, "Auth login attempt");

    if email.is_empty() || password.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Email and password are required.");
    }

    let row = sqlx::query_as::<_, UserRecord>(
        r#"SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1"#,
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await;

    let row = match row {
        Ok(Some(row)) => row,
        Ok(None) => {
            info!(email = %email, "Auth login failed: user not found");
            return error_response(StatusCode::UNAUTHORIZED, "Invalid email or password.");
        }
        Err(err) => {
            error!(email = %email, error = ?err, "Auth login failed: unable to query user");
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "Unable to query user.");
        }
    };

    let password_hash = match PasswordHash::new(&row.password_hash) {
        Ok(hash) => hash,
        Err(err) => {
            error!(email = %email, error = ?err, "Auth login failed: stored password hash invalid");
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "Stored password is invalid.");
        }
    };

    if Argon2::default().verify_password(password.as_bytes(), &password_hash).is_err() {
        info!(email = %email, "Auth login failed: invalid password");
        return error_response(StatusCode::UNAUTHORIZED, "Invalid email or password.");
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
        Err(err) => {
            error!(email = %email, error = ?err, "Auth login failed: JWT token creation failed");
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to generate auth token.")
        }
    }
}

async fn create_token(secret: &str, user_id: Uuid, email: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let exp = now + Duration::hours(24);
    let claims = Claims {
        sub: user_id,
        email: email.to_string(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
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
