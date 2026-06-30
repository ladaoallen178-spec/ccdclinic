use crate::api::bmi::{create_bmi_record, get_bmi_records};
use axum::{routing::post, Router};

pub fn bmi_routes() -> Router {
    Router::new().route("/", post(create_bmi_record).get(get_bmi_records))
}
