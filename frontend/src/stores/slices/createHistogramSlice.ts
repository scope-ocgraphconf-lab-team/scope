import { StateCreator } from 'zustand';
import { ExploreFlowStore } from '~/stores/exploreStore';
import { HistogramSlice } from './histogramSlice.types';

export const createHistogramSlice: StateCreator<ExploreFlowStore, [], [], HistogramSlice> = (set, get) => ({
    histogramStates: {},
    setHistogramState: (nodeId, state) => {
        //     set((prev) => ({
        //         histogramStates: {
        //             ...prev.histogramStates,
        //             [nodeId]: state,
        //         },
        //     }));
        // },
        // 1. Get the update function from the Graph Slice
        const { updateNodeData } = get();

        // 2. Write the state directly into the Node's data
        // This ensures it gets saved automatically with savePipeline()
        updateNodeData(nodeId, {
            histogramState: state,
        } as any);
    },
    clearHistogramState: (nodeId) => {
        //     set((prev) => {
        //         const { [nodeId]: _, ...rest } = prev.histogramStates;
        //         return { histogramStates: rest };
        //     });
        // },
        const { updateNodeData } = get();

        // Clear it by setting it to undefined in the node
        updateNodeData(nodeId, {
            histogramState: undefined,
        } as any);
    },
});
