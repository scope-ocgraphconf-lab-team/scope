import { create } from 'zustand';
import { ExploreFlowStore } from '~/types/store/exploreStore.types';
import { createGraphSlice } from './slices/createGraphSlice';
import { createPipelineSlice } from './slices/createPipelineSlice';
import { createColorSlice } from './slices/createColorSlice';
import { createHistogramSlice } from './slices/createHistogramSlice';

// Export types for consumption
export type { SavedPipeline, HistogramState } from '~/types/store/exploreStore.types';

export const useExploreFlowStore = create<ExploreFlowStore>((...a) => ({
    ...createGraphSlice(...a),
    ...createPipelineSlice(...a),
    ...createColorSlice(...a),
    ...createHistogramSlice(...a),
}));