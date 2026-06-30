use crate::api::inventory_logs::{create_inventory_log, get_inventory_logs};
use axum::{routing::post, Router};

pub fn inventory_log_routes() -> Router {
    Router::new().route("/", post(create_inventory_log).get(get_inventory_logs))
}
