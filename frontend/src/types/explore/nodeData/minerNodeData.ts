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
    | 'abstraction-abstraction';

export interface ConformanceInput {
    id: string;
    type: AssetType;
}

export interface ConformanceResult {
    fitness: number;
    precision: number;
    mode: ConformanceMode;
    inputA: ConformanceInput;
    inputB: ConformanceInput;
}

export type OcgraphMode = 'ocpt-case-ocels' | 'case-case';

export interface GraphAlignmentResult {
    mode: OcgraphMode;
    ocgraphconf: OcgraphconfResult;
    inputA: ConformanceInput;
    inputB: ConformanceInput;
}

export interface MinerExploreNodeData extends BaseExploreNodeData {
    algorithm?: string;
    noiseThreshold?: number;
    conformanceResult?: ConformanceResult;
    graphAlignmentResult?: GraphAlignmentResult;
}
