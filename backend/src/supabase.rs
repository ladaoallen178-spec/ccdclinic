use anyhow::Result;
use reqwest::Client;
use std::env;

pub async fn upload_file(bucket: &str, path: &str, bytes: Vec<u8>) -> Result<reqwest::Response> {
    let storage_base = env::var("SUPABASE_STORAGE_URL")?;
    let service_key = env::var("SUPABASE_SERVICE_ROLE_KEY")?;

    let url = format!(
        "{}/object/{}/{}",
        storage_base.trim_end_matches('/'),
        bucket,
        path
    );

    let client = Client::new();
    let resp = client
        .put(&url)
        .header("Authorization", format!("Bearer {}", service_key))
        .header("Content-Type", "application/octet-stream")
        .body(bytes)
        .send()
        .await?;

    Ok(resp)
}

pub fn public_file_url(bucket: &str, path: &str) -> Option<String> {
    if let Ok(supabase_url) = env::var("SUPABASE_URL") {
        let base = supabase_url.trim_end_matches('/');
        Some(format!(
            "{}/storage/v1/object/public/{}/{}",
            base, bucket, path
        ))
    } else if let Ok(storage_base) = env::var("SUPABASE_STORAGE_URL") {
        Some(format!(
            "{}/object/public/{}/{}",
            storage_base.trim_end_matches('/'),
            bucket,
            path
        ))
    } else {
        None
    }
}
