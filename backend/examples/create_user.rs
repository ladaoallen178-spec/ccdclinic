use sqlx::postgres::PgPoolOptions;
use std::env;
use std::str::FromStr;
use std::path::PathBuf;
use sqlx::postgres::PgConnectOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env files
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let current_dir = env::current_dir().unwrap_or_else(|_| manifest_dir.clone());

    for env_file in [
        current_dir.join(".env.local"),
        manifest_dir.join(".env.local"),
        current_dir.join(".env"),
        manifest_dir.join(".env"),
    ] {
        dotenvy::from_path(&env_file).ok();
    }
    
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL not set in .env file");
    
    let options = PgConnectOptions::from_str(&db_url)?;
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;

    let user_id = Uuid::new_v4();
    let email = "try123@gmail.com";
    let full_name = "Allen Ladao";
    let role = "Nurse";
    let password_hash = "$argon2id$v=19$m=19456,t=2,p=1$esgqzmKsmCNACoX1YfHF7A$0EdCWwNDqaTCSg7iG0hkoLX5vEyx432KxvDWubUW/Xo";

    let result = sqlx::query(
        r#"
        INSERT INTO users (id, email, full_name, role, password_hash, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (email) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(email)
    .bind(full_name)
    .bind(role)
    .bind(password_hash)
    .execute(&pool)
    .await?;

    if result.rows_affected() > 0 {
        println!("✅ User account created successfully!");
        println!("   Email: {}", email);
        println!("   Name: {}", full_name);
        println!("   Password: try123");
        println!("   Role: {}", role);
    } else {
        println!("⚠️  User account already exists with that email");
    }

    Ok(())
}
