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

export interface NodeDetail {
  id: number;
  label: string;
  element_type: "event" | "object";
}

export interface EdgeDetail {
  id: number;
  source_id: number;
  target_id: number;
  element_type: "df" | "e2o";
  label: string;
}

export interface NodeMatch { left_node_id: number; right_node_id: number; }
export interface EdgeMatch { left_edge_id: number; right_edge_id: number; }

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