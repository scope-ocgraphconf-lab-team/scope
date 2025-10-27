use crate::core::case_notion::advanced::{
    advanced_case_notion_type_level, best_advanced_case_notion,
};
use crate::core::case_notion::connected_component::connected_components_notion;
use crate::core::case_notion::log_graphs::build_log_graph_type_level;
use crate::core::case_notion::main::{
    CaseMeasure, CaseNotionCase, CaseNotionContext, CaseNotionEvaluation,
};
use crate::core::case_notion::measures::{average_score, calculate_measures, f1_from_measures};
use crate::core::case_notion::utils::{case_notion_to_cases, case_notion_to_ocels};
use crate::core::case_notion::traditional::{
    traditional_case_notion, traditional_case_notion_type_level,
};
use crate::traits::import_export::ImportableFromPath;
use crate::core::case_notion::generic::generic_case_notion;
use crate::models::case_notion::GenericCaseNotion;
use crate::models::ocel::OCEL;
use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::fs;
use rustc_hash::FxHashSet;


#[derive(Deserialize)]
pub(crate) struct CaseNotionQuery {
    object_type: Option<String>,
}

#[derive(Serialize)]
struct CaseNotionResponse {
    case_notion: &'static str,
    file_id: String,
    source_ocel_file: String,
    object_type: Option<String>,
    cases: Vec<CaseNotionCase>,
    measures: Vec<CaseMeasure>,
    total_score: f64,
    f1_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    type_level_graph: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    export_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    saved_as: Option<String>,
}

#[derive(Serialize)]
struct TraditionalTypeLevelResponse {
    case_notion: &'static str,
    object_type: String,
    measures: Vec<CaseMeasure>,
    total_score: f64,
    f1_score: Option<f64>,
    graph: Value,
}

enum ObjectTypeSelection {
    Default,
    Specific(String),
}

impl ObjectTypeSelection {
    fn from_query_param(param: Option<String>) -> Self {
        match param {
            Some(value) => {
                let trimmed = value.trim();
                if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("default") {
                    ObjectTypeSelection::Default
                } else {
                    ObjectTypeSelection::Specific(trimmed.to_string())
                }
            }
            None => ObjectTypeSelection::Default,
        }
    }

}


#[derive(Clone, Copy)]
enum CaseKind {
    Advanced,
    ConnectedComponents,
    Traditional,
}

impl CaseKind {
    fn label(self) -> &'static str {
        match self {
            CaseKind::Advanced => "Advanced Case Notion",
            CaseKind::ConnectedComponents => "Connected Components Case Notion",
            CaseKind::Traditional => "Traditional Case Notion",
        }
    }
}

fn not_found_response(kind: CaseKind, selection: &ObjectTypeSelection) -> (StatusCode, String) {
    let message = match kind {
        CaseKind::Advanced => match selection {
            ObjectTypeSelection::Default => {
                "No advanced case notion could be derived for any object type".to_string()
            }
            ObjectTypeSelection::Specific(value) => format!(
                "No advanced case notion could be derived for object type: {}",
                value
            ),
        },
        CaseKind::Traditional => match selection {
            ObjectTypeSelection::Default => {
                "No traditional case notion could be derived for any object type".to_string()
            }
            ObjectTypeSelection::Specific(value) => format!(
                "No traditional case notion could be derived for object type: {}",
                value
            ),
        },
        CaseKind::ConnectedComponents => unreachable!(
            "not_found_response should not be called for connected components case notion"
        ),
    };

    (StatusCode::NOT_FOUND, message)
}

pub async fn get_advanced_case_notion(
    Path(file_id): Path<String>,
    Query(query): Query<CaseNotionQuery>,
) -> impl IntoResponse {
    let selection = ObjectTypeSelection::from_query_param(query.object_type);

    let path = format!("./temp/ocel_v2_{}.json", file_id);
    let content = match fs::read_to_string(&path).await {
        Ok(data) => data,
        Err(err) => {
            eprintln!("read OCEL log failed: {err}");
            let response = if err.kind() == std::io::ErrorKind::NotFound {
                (
                    StatusCode::NOT_FOUND,
                    format!("No OCEL v2 file found for fileId: {}", file_id),
                )
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to read stored OCEL log".to_string(),
                )
            };
            return response.into_response();
        }
    };

    let ocel: OCEL = match serde_json::from_str(&content) {
        Ok(log) => log,
        Err(err) => {
            eprintln!("parse OCEL log failed: {err}");
            let response = (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Stored OCEL log is not valid JSON".to_string(),
            );
            return response.into_response();
        }
    };

    let context = CaseNotionContext::new(&ocel);

    let evaluation = match &selection {
        ObjectTypeSelection::Specific(requested) => {
            best_advanced_case_notion(&context, Some(requested.as_str()))
        }
        ObjectTypeSelection::Default => best_advanced_case_notion(&context, None),
    };

    let evaluation = match evaluation {
        Some(evaluation) => evaluation,
        None => return not_found_response(CaseKind::Advanced, &selection).into_response(),
    };

    let object_type = match evaluation.object_type.clone() {
        Some(object_type) => object_type,
        None => return not_found_response(CaseKind::Advanced, &selection).into_response(),
    };

    let graph_value = build_log_graph_type_level(&ocel);
    let type_level_graph = advanced_case_notion_type_level(
        &graph_value,
        object_type.as_str(),
        context.divergence_map(),
    );

    let cases = case_notion_to_cases(&evaluation.case_notion);

    let payload = CaseNotionResponse {
        case_notion: CaseKind::Advanced.label(),
        file_id,
        source_ocel_file: path,
        export_id: None,
        object_type: evaluation.object_type.clone(),
        cases,
        measures: evaluation.measures.clone(),
        total_score: evaluation.total_score,
        f1_score: evaluation.f1_score,
        type_level_graph: Some(type_level_graph),
        saved_as: None,
    };

    (StatusCode::OK, Json(payload)).into_response()
}

pub async fn get_connected_components_case_notion(
    Path(file_id): Path<String>,
) -> impl IntoResponse {
    let path = format!("./temp/ocel_v2_{}.json", file_id);
    let content = match fs::read_to_string(&path).await {
        Ok(data) => data,
        Err(err) => {
            eprintln!("read OCEL log failed: {err}");
            let response = if err.kind() == std::io::ErrorKind::NotFound {
                (
                    StatusCode::NOT_FOUND,
                    format!("No OCEL v2 file found for fileId: {}", file_id),
                )
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to read stored OCEL log".to_string(),
                )
            };
            return response.into_response();
        }
    };

    let ocel: OCEL = match serde_json::from_str(&content) {
        Ok(log) => log,
        Err(err) => {
            eprintln!("parse OCEL log failed: {err}");
            let response = (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Stored OCEL log is not valid JSON".to_string(),
            );
            return response.into_response();
        }
    };

    let context = CaseNotionContext::new(&ocel);

    let case_notion = connected_components_notion(
        context.cleaned_event_identifiers().clone(),
        context.object_identifiers().clone(),
    );

    let measures = calculate_measures(
        &case_notion,
        context.event_identifiers(),
        context.object_identifiers(),
        context.arches(),
        context.total_number_of_objects(),
        context.total_number_of_events(),
    );
    let total_score = average_score(&measures);
    let f1_score = f1_from_measures(&measures);

    let evaluation = CaseNotionEvaluation {
        object_type: None,
        measures,
        total_score,
        f1_score,
        case_notion,
    };

    let type_level_graph = build_log_graph_type_level(&ocel);

    let mut payload = build_response(
        CaseKind::ConnectedComponents,
        file_id,
        path,
        evaluation,
    );
    payload.type_level_graph = Some(type_level_graph);
    (StatusCode::OK, Json(payload)).into_response()
}

pub async fn get_traditional_case_notion(
    Path(file_id): Path<String>,
    Query(query): Query<CaseNotionQuery>,
) -> impl IntoResponse {
    let selection = ObjectTypeSelection::from_query_param(query.object_type);

    let path = format!("./temp/ocel_v2_{}.json", file_id);
    let content = match fs::read_to_string(&path).await {
        Ok(data) => data,
        Err(err) => {
            eprintln!("read OCEL log failed: {err}");
            let response = if err.kind() == std::io::ErrorKind::NotFound {
                (
                    StatusCode::NOT_FOUND,
                    format!("No OCEL v2 file found for fileId: {}", file_id),
                )
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to read stored OCEL log".to_string(),
                )
            };
            return response.into_response();
        }
    };

    let ocel: OCEL = match serde_json::from_str(&content) {
        Ok(log) => log,
        Err(err) => {
            eprintln!("parse OCEL log failed: {err}");
            let response = (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Stored OCEL log is not valid JSON".to_string(),
            );
            return response.into_response();
        }
    };

    let context = CaseNotionContext::new(&ocel);

    let evaluation = match &selection {
        ObjectTypeSelection::Specific(requested) => traditional_case_notion(
            &context,
            Some(requested.as_str()),
        ),
        ObjectTypeSelection::Default => traditional_case_notion(&context, None),
    }
    .ok_or_else(|| not_found_response(CaseKind::Traditional, &selection));

    let evaluation = match evaluation {
        Ok(evaluation) => evaluation,
        Err(response) => return response.into_response(),
    };

    let object_type = match evaluation.object_type.clone() {
        Some(object_type) => object_type,
        None => {
            let response = not_found_response(CaseKind::Traditional, &selection);
            return response.into_response();
        }
    };

    let graph = build_log_graph_type_level(&ocel);
    let partitioned_graph =
        traditional_case_notion_type_level(&graph, object_type.as_str());

    let response = TraditionalTypeLevelResponse {
        case_notion: CaseKind::Traditional.label(),
        object_type,
        measures: evaluation.measures.clone(),
        total_score: evaluation.total_score,
        f1_score: evaluation.f1_score,
        graph: partitioned_graph,
    };

    (StatusCode::OK, Json(response)).into_response()
}


pub async fn post_generic_case_notion(
    Path(file_id): Path<String>,
    Json(payload): Json<GenericCaseNotion>,
) -> Result<impl IntoResponse, (StatusCode, String)> { 
    log::debug!("Received GenericCaseNotion for file_id: {}", file_id);
    log::debug!("Payload: {:?}", payload);
    let ocel = OCEL::import_from_path(&file_id).await?;

    let case_notion = generic_case_notion(&ocel, &payload);

    log::debug!("case_notion: {:?}", case_notion);

    let context = CaseNotionContext::new(&ocel);
    let measures = calculate_measures(
        &case_notion,
        &context.event_identifiers_ref(),
        &context.object_identifiers_ref(),
        &context.arches_ref(),
        *context.total_number_of_objects_ref(),
        *context.total_number_of_events_ref(),
    );
    let total_score = average_score(&measures);
    let f1_score = f1_from_measures(&measures);

    log::debug!("measures: {:?}", measures);

    let evaluation = CaseNotionEvaluation {
        object_type: None,
        measures: measures.clone(),
        total_score,
        f1_score,
        case_notion,
    };
    
    Ok(axum::Json(measures))

}


fn build_response(
    kind: CaseKind,
    file_id: String,
    source_ocel_file: String,
    evaluation: CaseNotionEvaluation,
) -> CaseNotionResponse {
    let cases = case_notion_to_cases(&evaluation.case_notion);

    CaseNotionResponse {
        case_notion: kind.label(),
        file_id,
        source_ocel_file,
        export_id: None,
        object_type: evaluation.object_type.clone(),
        cases,
        measures: evaluation.measures.clone(),
        total_score: evaluation.total_score,
        f1_score: evaluation.f1_score,
        type_level_graph: None,
        saved_as: None,
    }
}

pub fn get_case_ocel(
    case_notion: &FxHashSet<(Vec<String>, Vec<String>, Vec<(String, String)>)>,
    ocel: &OCEL,
) -> Vec<OCEL> {
    let context = CaseNotionContext::new(ocel);
    case_notion_to_ocels(
        case_notion,
        context.cleaned_event_identifiers(),
        context.object_identifiers(),
        context.event_type_defs(),
        context.object_type_defs(),
        context.default_timestamp(),
        context.event_lookup(),
        context.object_lookup(),
    )
}
