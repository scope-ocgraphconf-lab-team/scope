use crate::core::clustering::k_medoids::{
    DistanceMetric, RunResult, cluster_ocels_with_metric_seeded, ensure_parent_dir_exists,
    run_k_sweep_save_jsonl,
};
use crate::models::ocel_collection::OCELCollection;
use crate::traits::import_export::ImportableFromPath;
use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use rand::{SeedableRng, rngs::StdRng, seq::SliceRandom};
use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::{BufWriter, Write};
use tokio::fs;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ClusterParams {
    pub k: Option<usize>,
    pub k_min: Option<usize>,
    pub k_max: Option<usize>,
    pub sample_sizes: Option<String>,
    pub sample_repetitions: Option<usize>,
    pub metric: Option<String>,
    pub base_seed: Option<u64>,
}

#[derive(Serialize)]
pub struct ClusteringResult {
    pub file_id: String,
    pub case_assignments: Vec<(String, usize)>,
    pub run: RunResult,
    pub metric: String,
}

#[derive(Serialize)]
pub struct SweepResultResponse {
    pub json_file_id: String,
    pub k_min: usize,
    pub k_max: usize,
    pub metric: String,
    pub base_seed: u64,
}

#[derive(Serialize)]
pub struct SampleSweepResultResponse {
    pub json_file_id: String,
    pub k: usize,
    pub metric: String,
    pub base_seed: u64,
    pub sample_sizes: Vec<usize>,
    pub sample_repetitions: usize,
    pub source_num_cases: usize,
}

#[derive(Serialize)]
struct SampleSweepJsonLine {
    source_num_cases: usize,
    sample_size: usize,
    sample_rep: usize,
    run: RunResult,
}

fn parse_metric(metric: Option<&str>) -> Result<(&'static str, DistanceMetric), String> {
    match metric {
        Some("dfg-typ") | None => Ok(("dfg-typ", DistanceMetric::OCDFGE2O_TypeOnly)),
        Some("dfg-obj") => Ok(("dfg-obj", DistanceMetric::OCDFGE2O_ObjectInstance)),
        Some(other) => Err(format!(
            "Invalid metric '{other}'. Allowed values are 'dfg-typ' and 'dfg-obj'."
        )),
    }
}

fn parse_sample_sizes(input: &str, total_n: usize) -> Result<Vec<usize>, String> {
    let mut sample_sizes = Vec::new();

    for raw_part in input.split(',') {
        let part = raw_part.trim().to_lowercase();
        if part.is_empty() {
            continue;
        }

        if part == "all" {
            sample_sizes.push(total_n);
            continue;
        }

        let sample_size = part
            .parse::<usize>()
            .map_err(|_| format!("Invalid sample size: {raw_part}"))?;
        if sample_size == 0 {
            return Err("sample_sizes cannot contain 0.".to_string());
        }

        sample_sizes.push(sample_size.min(total_n));
    }

    sample_sizes.sort_unstable();
    sample_sizes.dedup();

    if sample_sizes.is_empty() {
        return Err("No valid sample_sizes provided.".to_string());
    }

    if !sample_sizes.contains(&total_n) {
        sample_sizes.push(total_n);
    }

    Ok(sample_sizes)
}

fn clustering_path(kind: &str, file_id: &str, extension: &str) -> String {
    format!("./temp/clustering_{}_{}.{}", kind, file_id, extension)
}

fn case_id_or_index(case_ocel: &serde_json::Value, idx: usize) -> String {
    case_ocel
        .get("case_id")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .unwrap_or_else(|| idx.to_string())
}

fn sample_case_ocels(
    case_ocels: &[serde_json::Value],
    sample_size: usize,
    seed: u64,
) -> Vec<serde_json::Value> {
    let sample_size = sample_size.min(case_ocels.len());
    let mut rng = StdRng::seed_from_u64(seed);
    let mut indices: Vec<usize> = (0..case_ocels.len()).collect();
    indices.shuffle(&mut rng);
    indices.truncate(sample_size);
    indices.sort_unstable();

    indices
        .into_iter()
        .map(|idx| case_ocels[idx].clone())
        .collect()
}

fn collection_to_values(
    collection: OCELCollection,
) -> Result<Vec<serde_json::Value>, (StatusCode, String)> {
    collection
        .ocels
        .into_iter()
        .map(|ocel| {
            serde_json::to_value(ocel).map_err(|err| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to prepare case OCEL for clustering: {err}"),
                )
            })
        })
        .collect()
}

fn run_case_count_sweep_save_jsonl(
    case_ocels: &[serde_json::Value],
    sample_sizes: &[usize],
    repetitions: usize,
    k: usize,
    metric: DistanceMetric,
    json_path: &str,
    base_seed: u64,
) -> std::io::Result<()> {
    let total_n = case_ocels.len();
    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(json_path)?;
    let mut writer = BufWriter::new(file);

    for &sample_size in sample_sizes {
        for sample_rep in 0..repetitions.max(1) {
            let sample_seed = base_seed
                .wrapping_add(sample_size as u64 * 10_000)
                .wrapping_add(sample_rep as u64);
            let sampled_case_ocels = sample_case_ocels(case_ocels, sample_size, sample_seed);
            if sampled_case_ocels.is_empty() {
                continue;
            }

            let effective_k = k.min(sampled_case_ocels.len());
            let (_assignments, run) = cluster_ocels_with_metric_seeded(
                &sampled_case_ocels,
                effective_k,
                metric,
                sample_seed,
            );

            let line = SampleSweepJsonLine {
                source_num_cases: total_n,
                sample_size: sampled_case_ocels.len(),
                sample_rep,
                run,
            };
            let line_json = serde_json::to_string(&line).map_err(std::io::Error::other)?;
            writeln!(writer, "{}", line_json)?;
            writer.flush()?;
        }
    }

    Ok(())
}

pub async fn cluster_case_ocels(
    Path(case_ocels_file_id): Path<String>,
    Query(params): Query<ClusterParams>,
) -> impl IntoResponse {
    if case_ocels_file_id.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            "file_id cannot be empty".to_string(),
        )
            .into_response();
    }

    let collection = match OCELCollection::import_from_path(&case_ocels_file_id).await {
        Ok(collection) => collection,
        Err(response) => return response.into_response(),
    };

    let case_ocels = match collection_to_values(collection) {
        Ok(case_ocels) => case_ocels,
        Err(response) => return response.into_response(),
    };

    if case_ocels.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            "Case OCEL collection cannot be empty".to_string(),
        )
            .into_response();
    }

    let (metric_str, metric) = match parse_metric(params.metric.as_deref()) {
        Ok(parsed) => parsed,
        Err(message) => return (StatusCode::BAD_REQUEST, message).into_response(),
    };
    let base_seed = params.base_seed.unwrap_or(53);

    if let Some(sample_sizes_param) = params.sample_sizes.as_deref() {
        let k = match params.k {
            Some(k) if k >= 1 => k,
            _ => {
                return (
                    StatusCode::BAD_REQUEST,
                    "sample_sizes mode requires k >= 1.".to_string(),
                )
                    .into_response();
            }
        };
        let sample_sizes = match parse_sample_sizes(sample_sizes_param, case_ocels.len()) {
            Ok(sample_sizes) => sample_sizes,
            Err(message) => return (StatusCode::BAD_REQUEST, message).into_response(),
        };
        let sample_repetitions = params.sample_repetitions.unwrap_or(3).max(1);
        let json_file_id = Uuid::new_v4().to_string();
        let json_path = clustering_path("sample_sweep", &json_file_id, "jsonl");

        let blocking_case_ocels = case_ocels.clone();
        let blocking_sample_sizes = sample_sizes.clone();
        let blocking_path = json_path.clone();
        let blocking_result = tokio::task::spawn_blocking(move || -> Result<(), String> {
            ensure_parent_dir_exists(&blocking_path)
                .map_err(|err| format!("Failed to create clustering output directory: {err}"))?;
            run_case_count_sweep_save_jsonl(
                &blocking_case_ocels,
                &blocking_sample_sizes,
                sample_repetitions,
                k,
                metric,
                &blocking_path,
                base_seed,
            )
            .map_err(|err| format!("Failed to run sample-size clustering sweep: {err}"))
        })
        .await;

        match blocking_result {
            Ok(Ok(())) => {}
            Ok(Err(message)) => {
                return (StatusCode::INTERNAL_SERVER_ERROR, message).into_response();
            }
            Err(err) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Clustering task failed: {err}"),
                )
                    .into_response();
            }
        }

        return (
            StatusCode::OK,
            Json(SampleSweepResultResponse {
                json_file_id,
                k,
                metric: metric_str.to_string(),
                base_seed,
                sample_sizes,
                sample_repetitions,
                source_num_cases: case_ocels.len(),
            }),
        )
            .into_response();
    }

    if let (Some(k_min), Some(k_max)) = (params.k_min, params.k_max) {
        if k_min < 2 || k_max < 2 || k_min > k_max {
            return (
                StatusCode::BAD_REQUEST,
                "k_min and k_max must be >= 2 with k_min <= k_max.".to_string(),
            )
                .into_response();
        }

        let json_file_id = Uuid::new_v4().to_string();
        let json_path = clustering_path("sweep", &json_file_id, "jsonl");
        let blocking_case_ocels = case_ocels.clone();
        let blocking_path = json_path.clone();
        let blocking_result = tokio::task::spawn_blocking(move || -> Result<(), String> {
            ensure_parent_dir_exists(&blocking_path)
                .map_err(|err| format!("Failed to create clustering output directory: {err}"))?;
            run_k_sweep_save_jsonl(
                &blocking_case_ocels,
                k_min,
                k_max,
                metric,
                &blocking_path,
                base_seed,
            )
            .map_err(|err| format!("Failed to run clustering k sweep: {err}"))?;
            Ok(())
        })
        .await;

        match blocking_result {
            Ok(Ok(())) => {}
            Ok(Err(message)) => {
                return (StatusCode::INTERNAL_SERVER_ERROR, message).into_response();
            }
            Err(err) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Clustering task failed: {err}"),
                )
                    .into_response();
            }
        }

        return (
            StatusCode::OK,
            Json(SweepResultResponse {
                json_file_id,
                k_min,
                k_max,
                metric: metric_str.to_string(),
                base_seed,
            }),
        )
            .into_response();
    }

    let requested_k = match params.k {
        Some(k) if k >= 1 => k,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                "Please provide k or alternatively k_min and k_max.".to_string(),
            )
                .into_response();
        }
    };
    let effective_k = requested_k.min(case_ocels.len());

    let clustering_input = case_ocels.clone();
    let blocking_result = tokio::task::spawn_blocking(move || {
        cluster_ocels_with_metric_seeded(&clustering_input, effective_k, metric, base_seed)
    })
    .await;

    let (cluster_assignments, run) = match blocking_result {
        Ok(result) => result,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Clustering task failed: {err}"),
            )
                .into_response();
        }
    };

    let case_assignments = case_ocels
        .iter()
        .enumerate()
        .map(|(idx, case_ocel)| (case_id_or_index(case_ocel, idx), cluster_assignments[idx]))
        .collect();

    let file_id = Uuid::new_v4().to_string();
    let result = ClusteringResult {
        file_id: file_id.clone(),
        case_assignments,
        run,
        metric: metric_str.to_string(),
    };
    let result_path = clustering_path("result", &file_id, "json");

    if let Err(err) = ensure_parent_dir_exists(&result_path) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create clustering output directory: {err}"),
        )
            .into_response();
    }

    match serde_json::to_string_pretty(&result) {
        Ok(json) => {
            if let Err(err) = fs::write(&result_path, json).await {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to store clustering result: {err}"),
                )
                    .into_response();
            }
        }
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to serialize clustering result: {err}"),
            )
                .into_response();
        }
    }

    (StatusCode::OK, Json(result)).into_response()
}
