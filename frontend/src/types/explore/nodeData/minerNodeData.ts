import { BaseExploreNodeData } from '~/types/explore/nodeData/baseNodeData';
import type { AssetType } from '~/types/files.types';
import type { OcgraphconfResult } from '~/services/api';

export type ConformanceMode =
    | 'ocpt-ocel'
    | 'ocpt-abstraction'
    | 'ocpt-ocpt'
    | 'extended-ocel'
    | 'extended-abstraction'
    | 'extended-extended'
    | 'abstraction-abstraction'
    | 'ocpt-case-ocels';   // NEW

export interface ConformanceInput {
    id: string;
    type: AssetType;
}

export interface ConformanceResult {
    fitness: number;
    precision: number | null;   // ocgraphconf returns null for precision, but we want to keep it in the type for consistency
    mode: ConformanceMode;
    inputA: ConformanceInput;
    inputB: ConformanceInput;
     ocgraphconf?: OcgraphconfResult;   // NEW — full result for ocpt-case-ocels mode
}

export interface MinerExploreNodeData extends BaseExploreNodeData {
    algorithm?: string;
    noiseThreshold?: number;
    conformanceResult?: ConformanceResult;
}
