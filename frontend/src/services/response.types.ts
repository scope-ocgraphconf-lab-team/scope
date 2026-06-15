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

export interface DeviationElement {
    element_type: string;
    label: string;
    source_node?: string;
    target_node?: string;
    reason: string;
}

export interface GraphConformanceResponse {
    diagnostics_summary: {
        fitness_score: number;
        total_assignment_cost: number;
        query_case_id: string;
    };
    optimal_assignment: {
        insertions: DeviationElement[];
        removals: DeviationElement[];
    };
}