export interface GetCaseNotionsResponse {
    case_ocels_file_id: string;
}

export interface OCEL {
    [key: string]: unknown;
}

export interface CaseOcelResponse {
    origin_file_id_ocel: string;
    case_notion_type: string;
    object_type?: string;
    case_ocels: OCEL[];
}

// Mirrors the backend alignment_details descriptors (models/ocgraphconf_case_compare.rs).
export interface NodeDetail {
    id: number;
    label: string;
    element_type: 'event' | 'object';
}

export interface EdgeDetail {
    id: number;
    source_id: number;
    target_id: number;
    element_type: 'df' | 'e2o'; // drives DF/E2O styling without parsing the label
    label: string;
}

export interface NodeMatch {
    left_node_id: number;
    right_node_id: number;
}

export interface EdgeMatch {
    left_edge_id: number;
    right_edge_id: number;
}

// Full node/edge arrays + matched/unmatched id lists.
export interface CaseAlignmentDetails {
    matched_nodes: NodeMatch[];
    matched_edges: EdgeMatch[];
    left_graph_nodes: NodeDetail[];
    left_graph_edges: EdgeDetail[];
    right_graph_nodes: NodeDetail[];
    right_graph_edges: EdgeDetail[];
    left_unmatched_node_ids: number[];
    right_unmatched_node_ids: number[];
    left_unmatched_edge_ids: number[];
    right_unmatched_edge_ids: number[];
}

// Unified result for both ocgraphconf modes; left/right fields are what the viewer reads.
export interface OcgraphconfResult {
    model_kind?: string;
    model_file_id?: string;
    case_ocels_file_id: string;
    case_index?: number;
    left_case_index?: number;
    right_case_index?: number;
    origin_file_id_ocel: string;
    case_notion_type: string;
    object_type: string;
    case_notion_file_id: string;
    alignment_cost: number;
    fitness: number;
    precision: number | null;

    left_nodes: number;
    left_edges: number;
    right_nodes: number;
    right_edges: number;
    left_size: number;
    right_size: number;
    matched_node_count: number;
    matched_edge_count: number;
    left_unmatched_node_count: number;
    right_unmatched_node_count: number;
    left_unmatched_edge_count: number;
    right_unmatched_edge_count: number;

    void_node_count: number;
    void_edge_count: number;
    alignment_details: CaseAlignmentDetails | null;
}