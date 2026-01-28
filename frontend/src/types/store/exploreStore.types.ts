import {
    Connection,
    Edge,
    EdgeChange,
    NodeChange,
} from '@xyflow/react';
import { ExploreNode, ExploreNodeData } from '~/types/explore/nodes';

export interface SavedPipeline {
    id: string;
    name: string;
    nodes: ExploreNode[];
    edges: Edge[];
    savedAt: string;
}

export interface HistogramState {
    selections: Record<string, number[]>;
    isSubmitted: boolean;
}

export interface GraphSlice {
    nodes: ExploreNode[];
    edges: Edge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    setNodes: (nodes: ExploreNode[]) => void;
    setEdges: (edges: Edge[]) => void;
    updateNodeData: (
        nodeId: string,
        newData: Partial<ExploreNodeData> | ((prev: ExploreNodeData) => Partial<ExploreNodeData>)
    ) => void;
    addNode: (node: ExploreNode) => void;
    removeNode: (nodeId: string) => void;
    removeEdge: (edgeId: string) => void;
    getNode: (nodeId: string) => ExploreNode | undefined;
    clearFlow: () => void;
}

export interface PipelineSlice {
    currentPipeline: {
        id: string | null;
        name: string | null;
    };
    savePipeline: (name: string, pipelineIdToOverwrite?: string) => void;
    loadPipeline: (pipelineId: string) => void;
    getSavedPipelines: () => SavedPipeline[];
    deletePipeline: (pipelineId: string) => void;
}

export interface ColorSlice {
    colorMaps: Record<string, Record<string, string>>;
    fileColorIndexes: Record<string, number>;
    initializeDataState: (fileId: string, objectTypes: string[]) => void;
    getColorForObject: (fileId: string, objectType: string) => string;
}

export interface HistogramSlice {
    histogramStates: Record<string, HistogramState>;
    setHistogramState: (nodeId: string, state: HistogramState) => void;
    clearHistogramState: (nodeId: string) => void;
}

export type ExploreFlowStore = GraphSlice & PipelineSlice & ColorSlice & HistogramSlice;
