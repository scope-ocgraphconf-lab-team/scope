use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcgraphconfCaseCompareRequest {
    pub case_ocels_file_id: String,
    pub left_case_index: usize,
    pub right_case_index: usize,
    #[serde(default)]
    pub include_alignment_details: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcgraphconfCaseCompareResponse {
    pub case_ocels_file_id: String,
    pub left_case_index: usize,
    pub right_case_index: usize,
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
    pub left_case_nodes: usize,
    pub left_case_edges: usize,
    pub right_case_nodes: usize,
    pub right_case_edges: usize,
    pub left_case_size: usize,
    pub right_case_size: usize,
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

//define new Node and Edge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeDetail {
    pub id: usize,
    pub label: String,
    pub element_type: String, // "event" | "object"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeDetail {
    pub id: usize,
    pub source_id: usize,
    pub target_id: usize,
    pub element_type: String, // "df" | "e2o"
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseAlignmentDetails {
    pub matched_nodes: Vec<NodeMatch>,
    pub matched_edges: Vec<EdgeMatch>,

    // Full-graph arrays — every node/edge, matched or not (Option 1, uniform)
    pub left_graph_nodes: Vec<NodeDetail>,
    pub left_graph_edges: Vec<EdgeDetail>,
    pub right_graph_nodes: Vec<NodeDetail>,
    pub right_graph_edges: Vec<EdgeDetail>,

    // Unmatched = id lists only; details are looked up in the full arrays
    pub left_unmatched_node_ids: Vec<usize>,
    pub right_unmatched_node_ids: Vec<usize>,
    pub left_unmatched_edge_ids: Vec<usize>,
    pub right_unmatched_edge_ids: Vec<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct NodeMatch {
    pub left_node_id: usize,
    pub right_node_id: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct EdgeMatch {
    pub left_edge_id: usize,
    pub right_edge_id: usize,
}
