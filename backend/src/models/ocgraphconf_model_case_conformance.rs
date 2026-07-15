use crate::models::ocgraphconf_case_compare::CaseAlignmentDetails;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct OcgraphconfModelCaseConformanceRequest {
    pub case_ocels_file_id: String,
    pub case_index: usize,
    #[serde(default)]
    pub include_alignment_details: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct OcgraphconfModelCaseConformanceResponse {
    pub model_kind: String,
    pub model_file_id: String,
    pub case_ocels_file_id: String,
    pub case_index: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin_file_id_ocel: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub case_notion_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub object_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub case_notion_file_id: Option<String>,
    pub alignment_cost: f64,
    pub fitness: f64,
    pub precision: Option<f64>,
    pub left_nodes: usize,
    pub left_edges: usize,
    pub right_nodes: usize,
    pub right_edges: usize,
    pub left_size: usize,
    pub right_size: usize,
    pub matched_node_count: usize,
    pub matched_edge_count: usize,
    pub left_unmatched_node_count: usize,
    pub right_unmatched_node_count: usize,
    pub left_unmatched_edge_count: usize,
    pub right_unmatched_edge_count: usize,
    pub void_node_count: usize,
    pub void_edge_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alignment_details: Option<CaseAlignmentDetails>,
}
