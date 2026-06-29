use axum::{routing::{get, post}, Router};
use crate::api::inventory::{create_inventory, get_inventory, get_inventory_item, delete_inventory, update_inventory_stock};

pub fn inventory_routes() -> Router {
    Router::new()
        .route("/", post(create_inventory).get(get_inventory))
        .route("/{id}", get(get_inventory_item).delete(delete_inventory).put(update_inventory_stock))
}
