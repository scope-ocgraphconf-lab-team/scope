use axum::{Json, extract::Path as AxumPath, http::StatusCode, response::IntoResponse};
use serde_json::json;

use crate::models::ocel::{IndexLinkedOCEL, OCEL};
use crate::models::ocpt::OCPT as BackendOCPT;
use crate::traits::import_export::ImportableFromPath;
use process_mining::conformance::object_centric::object_centric_language_abstraction::OCLanguageAbstraction;

fn abstraction_payload(
    file_id: &str,
    source_kind: &str,
    abstraction: &OCLanguageAbstraction,
) -> serde_json::Value {
    json!({
        "file_id": file_id,
        "source_kind": source_kind,
        "abstraction": abstraction
    })
}

async fn compute_ocel_abstraction(
    ocel: OCEL,
) -> Result<OCLanguageAbstraction, (StatusCode, String)> {
    tokio::task::spawn_blocking(move || {
        let locel = IndexLinkedOCEL::from_ocel(ocel);
        OCLanguageAbstraction::create_from_ocel(&locel)
    })
    .await
    .map_err(|err| {
        log::error!("Failed to compute OCEL abstraction: {}", err);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to compute abstraction".to_string(),
        )
    })
}

async fn compute_ocpt_abstraction(
    ocpt: BackendOCPT,
) -> Result<OCLanguageAbstraction, (StatusCode, String)> {
    tokio::task::spawn_blocking(move || OCLanguageAbstraction::create_from_oc_process_tree(&ocpt))
        .await
        .map_err(|err| {
            log::error!("Failed to compute OCPT abstraction: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to compute abstraction".to_string(),
            )
        })
}

pub async fn get_ocel_abstraction(AxumPath(file_id): AxumPath<String>) -> impl IntoResponse {
    let ocel = match OCEL::import_from_path(&file_id).await {
        Ok(ocel) => ocel,
        Err((status, message)) => return (status, message).into_response(),
    };

    let abstraction = match compute_ocel_abstraction(ocel).await {
        Ok(abstraction) => abstraction,
        Err((status, message)) => return (status, message).into_response(),
    };

    Json(abstraction_payload(&file_id, "ocel", &abstraction)).into_response()
}

pub async fn get_ocpt_abstraction(AxumPath(file_id): AxumPath<String>) -> impl IntoResponse {
    let ocpt = match BackendOCPT::import_from_path(&file_id).await {
        Ok(ocpt) => ocpt,
        Err((status, message)) => return (status, message).into_response(),
    };

    if !ocpt.is_valid() {
        return (
            StatusCode::BAD_REQUEST,
            "Source OCPT is invalid".to_string(),
        )
            .into_response();
    }

    let abstraction = match compute_ocpt_abstraction(ocpt).await {
        Ok(abstraction) => abstraction,
        Err((status, message)) => return (status, message).into_response(),
    };

    Json(abstraction_payload(&file_id, "ocpt", &abstraction)).into_response()
}

pub async fn get_extended_ocpt_abstraction(
    AxumPath(file_id): AxumPath<String>,
) -> impl IntoResponse {
    let extended_ocpt_path = format!("./temp/extended_ocpt_{}.json", file_id);
    let ocpt = match BackendOCPT::from_json_file(&extended_ocpt_path).await {
        Ok(ocpt) => ocpt,
        Err((status, message)) => return (status, message).into_response(),
    };

    if !ocpt.is_valid() {
        return (
            StatusCode::BAD_REQUEST,
            "Source extended OCPT is invalid".to_string(),
        )
            .into_response();
    }

    let abstraction = match compute_ocpt_abstraction(ocpt).await {
        Ok(abstraction) => abstraction,
        Err((status, message)) => return (status, message).into_response(),
    };

    Json(abstraction_payload(&file_id, "extended_ocpt", &abstraction)).into_response()
}
