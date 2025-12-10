export interface OCEL {
    [key: string]: any;
}

export interface CaseOcelResponse {
    origin_file_id_ocel: string;
    case_notion_type: string;
    object_type?: string;
    case_notion_file_id: string;
    case_ocels: OCEL[];
}
