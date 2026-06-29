use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use rand::thread_rng;
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: cargo run --example gen_password_hash -- <password>");
        eprintln!("Example: cargo run --example gen_password_hash -- try123");
        std::process::exit(1);
    }

    let password = &args[1];
    
    let salt = SaltString::generate(&mut thread_rng());
    let password_hash = match Argon2::default().hash_password(password.as_bytes(), &salt) {
        Ok(hash) => hash.to_string(),
        Err(e) => {
            eprintln!("Failed to hash password: {}", e);
            std::process::exit(1);
        }
    };

    println!("Password: {}", password);
    println!("Hash: {}", password_hash);
    println!("\nSQL to insert user:");
    println!("INSERT INTO users (id, email, full_name, role, password_hash, created_at)");
    println!("VALUES (gen_random_uuid(), 'try123@gmail.com', 'Allen Ladao', 'Nurse', '{}', NOW());", password_hash);
}
