use crate::core::ocgraphconf_case_compare::compare::AlignmentResult;
use crate::core::ocgraphconf_case_compare::convert::{CaseGraph, CaseNodeKind, CaseEdgeType};
use crate::core::ocgraphconf_case_compare::extract::SelectedCases;
use crate::models::ocgraphconf_case_compare::{
    CaseAlignmentDetails, OcgraphconfCaseCompareRequest, OcgraphconfCaseCompareResponse,
    UnmatchedNodeDetail, UnmatchedEdgeDetail,
};
use axum::http::StatusCode;
use serde_json::Value;
use std::collections::HashMap;

//Find the Node detail using id
fn get_node_detail(graph: &CaseGraph, id: usize) -> UnmatchedNodeDetail {
    if let Some(node) = graph.nodes.get(&id) {
        let (label, element_type) = match &node.kind {
            CaseNodeKind::Event { event_type, .. } => (event_type.clone(), "event".to_string()),
            CaseNodeKind::Object { object_type, .. } => (object_type.clone(), "object".to_string()),
        };
        UnmatchedNodeDetail { id, label, element_type }
    } else {
        UnmatchedNodeDetail { id, label: format!("Node {id}"), element_type: "unknown".to_string() }
    }
}

//Find the Edge detail using id
fn get_edge_detail(graph: &CaseGraph, id: usize) -> UnmatchedEdgeDetail {
    if let Some(edge) = graph.edges.get(&id) {
        let label = match edge.edge_type {
            CaseEdgeType::DF => "DF (Directly Follows)".to_string(),
            CaseEdgeType::E2O => "E2O (Event to Object)".to_string(),
        };
        UnmatchedEdgeDetail { id, source_id: edge.from, target_id: edge.to, label }
    } else {
        UnmatchedEdgeDetail { id, source_id: 0, target_id: 0, label: format!("Edge {id}") }
    }
}

pub fn build_response(
    request: &OcgraphconfCaseCompareRequest,
    selected_cases: &SelectedCases,
    left_graph: &CaseGraph,
    right_graph: &CaseGraph,
    alignment: &AlignmentResult,
) -> Result<OcgraphconfCaseCompareResponse, (StatusCode, String)> {
    let left_case_nodes = left_graph.nodes.len();
    let left_case_edges = left_graph.edges.len();
    let right_case_nodes = right_graph.nodes.len();
    let right_case_edges = right_graph.edges.len();
    let left_case_size = left_case_nodes + left_case_edges;
    let right_case_size = right_case_nodes + right_case_edges;
    let normalizer = (left_case_size + right_case_size).max(1) as f64;
    let fitness = (1.0 - (alignment.alignment_cost / normalizer)).max(0.0);

    //Using the new defined Node and Edge to build the alignment details
    let left_unmatched_nodes = alignment.left_unmatched_node_ids.iter().map(|&id| get_node_detail(left_graph, id)).collect();
    let right_unmatched_nodes = alignment.right_unmatched_node_ids.iter().map(|&id| get_node_detail(right_graph, id)).collect();
    let left_unmatched_edges = alignment.left_unmatched_edge_ids.iter().map(|&id| get_edge_detail(left_graph, id)).collect();
    let right_unmatched_edges = alignment.right_unmatched_edge_ids.iter().map(|&id| get_edge_detail(right_graph, id)).collect();

    Ok(OcgraphconfCaseCompareResponse {
        case_ocels_file_id: request.case_ocels_file_id.clone(),
        left_case_index: request.left_case_index,
        right_case_index: request.right_case_index,
        origin_file_id_ocel: attr_string(&selected_cases.attributes, "origin_file_id_ocel"),
        case_notion_type: attr_string(&selected_cases.attributes, "case_notion_type"),
        object_type: attr_string(&selected_cases.attributes, "object_type"),
        case_notion_file_id: attr_string(&selected_cases.attributes, "case_notion_file_id"),
        alignment_cost: alignment.alignment_cost,
        fitness,
        precision: None,
        left_case_nodes,
        left_case_edges,
        right_case_nodes,
        right_case_edges,
        left_case_size,
        right_case_size,
        matched_node_count: alignment.matched_nodes.len(),
        matched_edge_count: alignment.matched_edges.len(),
        left_unmatched_node_count: alignment.left_unmatched_node_ids.len(),
        right_unmatched_node_count: alignment.right_unmatched_node_ids.len(),
        left_unmatched_edge_count: alignment.left_unmatched_edge_ids.len(),
        right_unmatched_edge_count: alignment.right_unmatched_edge_ids.len(),
        void_node_count: alignment.left_unmatched_node_ids.len() + alignment.right_unmatched_node_ids.len(),
        void_edge_count: alignment.left_unmatched_edge_ids.len() + alignment.right_unmatched_edge_ids.len(),
        alignment_details: request.include_alignment_details.then_some(CaseAlignmentDetails {
            matched_nodes: alignment.matched_nodes.clone(),
            matched_edges: alignment.matched_edges.clone(),
            left_unmatched_nodes,
            right_unmatched_nodes,
            left_unmatched_edges,
            right_unmatched_edges,
        }),
    })
}

fn attr_string(attributes: &HashMap<String, Value>, key: &str) -> Option<String> {
    attributes.get(key).and_then(Value::as_str).map(ToOwned::to_owned)
}