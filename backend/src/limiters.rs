use axum::{
    body::Body,
    extract::Request,
    middleware::Next,
    response::Response,
};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

#[derive(Clone)]
pub struct ConcurrencyLimiter {
    count: Arc<AtomicU32>,
    max: u32,
}

impl ConcurrencyLimiter {
    pub fn new(max: u32) -> Self {
        ConcurrencyLimiter {
            count: Arc::new(AtomicU32::new(0)),
            max,
        }
    }

    pub fn acquire(&self) -> bool {
        let mut current = self.count.load(Ordering::SeqCst);
        while current < self.max {
            match self.count.compare_exchange(
                current,
                current + 1,
                Ordering::SeqCst,
                Ordering::SeqCst,
            ) {
                Ok(_) => return true,
                Err(new_current) => current = new_current,
            }
        }
        false
    }

    pub fn release(&self) {
        self.count.fetch_sub(1, Ordering::SeqCst);
    }
}

pub async fn enforce_concurrency(
    limiter: ConcurrencyLimiter,
    request: Request,
    next: Next,
) -> Response {
    if !limiter.acquire() {
        return Response::builder()
            .status(429)
            .body(Body::from("Too many requests"))
            .unwrap();
    }

    let response = next.run(request).await;
    limiter.release();
    response
}
