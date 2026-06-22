use serde::{Deserialize, Serialize};
use crate::core::ocgraphconf_case_compare::convert::CaseGraph;

#[derive(Debug, Clone, Deserialize)]
pub struct OcgraphconfCaseCompareRequest {
    pub case_ocels_file_id: String,
    pub left_case_index: usize,
    pub right_case_index: usize,
    #[serde(default)]
    pub include_alignment_details: bool,
}

#[derive(Debug, Clone, Serialize)]
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
    pub left_graph: CaseGraph,
    pub right_graph: CaseGraph,
}

//define new Node and Edge
#[derive(Debug, Clone, Serialize)]
pub struct UnmatchedNodeDetail {
    pub id: usize,
    pub label: String,
    pub element_type: String, //"event" OR "object"
}

#[derive(Debug, Clone, Serialize)]
pub struct UnmatchedEdgeDetail {
    pub id: usize,
    pub source_id: usize,
    pub target_id: usize,
    pub label: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CaseAlignmentDetails {
    pub matched_nodes: Vec<NodeMatch>,
    pub matched_edges: Vec<EdgeMatch>,
    
    // use the new difined Node and Edge
    pub left_unmatched_nodes: Vec<UnmatchedNodeDetail>,
    pub right_unmatched_nodes: Vec<UnmatchedNodeDetail>,
    pub left_unmatched_edges: Vec<UnmatchedEdgeDetail>,
    pub right_unmatched_edges: Vec<UnmatchedEdgeDetail>,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize)]
pub struct NodeMatch {
    pub left_node_id: usize,
    pub right_node_id: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize)]
pub struct EdgeMatch {
    pub left_edge_id: usize,
    pub right_edge_id: usize,
}
