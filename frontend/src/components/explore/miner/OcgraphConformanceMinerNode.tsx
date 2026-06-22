// ============================================================================
// NEW FILE: src/components/explore/miner/OcgraphConformanceMinerNode.tsx
// ============================================================================
// A dedicated node for object-centric GRAPH-based conformance (ocgraphconf).
// Separate from the existing ConformanceMinerNode so there is no ambiguity
// between abstraction-based and graph-based conformance: placing THIS node is
// the user's explicit choice of graph-based checking.
//
// Modes:
//   - ocpt-case  : OCPT (model) + OCEL Collection (case)         [WORKS]
//   - case-case  : OCEL Collection, two case indices (log-vs-log)[WORKS]
//   - ocpn-case  : OCPN (model) + OCEL Collection                [DEFERRED]
//                  No OCPN file type in the frontend yet — slot left ready.
// ============================================================================

import { memo, useEffect, useMemo, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useMinerOutput } from '~/hooks/explore/useMinerAssets';
import { useExploreFlowStore } from '~/stores/exploreStore';
import {
    useGetConformanceOcptCaseOcelsOcgraphconf,
    useGetConformanceCaseCaseOcgraphconf,
} from '~/services/queries';
import type { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { MinerNode } from '~/types/explore/nodes';
import type { AssetType } from '~/types/files.types';

type OcgraphKind = 'ocpt' | 'case_ocels'; // 'ocpn' added when OCPN exists

function ocgraphAssetKind(type: AssetType): OcgraphKind | null {
    if (type === 'ocptFile' || type === 'ocptAsset' || type === 'identityOcptAsset') return 'ocpt';
    if (type === 'ocelCollectionFile') return 'case_ocels';
    return null;
}

type OcgraphMode = 'ocpt-case-ocels' | 'case-case'; // | 'ocpn-case-ocels'

interface OcgraphDetected {
    mode: OcgraphMode;
    // For ocpt-case: a = model (ocpt), b = collection.
    // For case-case: a = b = the single collection (two indices chosen in UI).
    a: BaseExploreNodeAsset;
    b: BaseExploreNodeAsset;
}

function detectOcgraph(
    asset1: BaseExploreNodeAsset | null,
    asset2: BaseExploreNodeAsset | null
): OcgraphDetected | null {
    if (!asset1 || !asset2) return null;
    const k1 = ocgraphAssetKind(asset1.type);
    const k2 = ocgraphAssetKind(asset2.type);
    if (!k1 || !k2) return null;

    // OCPT (model) + case collection
    if (k1 === 'ocpt' && k2 === 'case_ocels') return { mode: 'ocpt-case-ocels', a: asset1, b: asset2 };
    if (k2 === 'ocpt' && k1 === 'case_ocels') return { mode: 'ocpt-case-ocels', a: asset2, b: asset1 };

    // case + case: both are collections. (Backend compares two cases within ONE
    // collection, so we use asset1's collection id and let the UI pick indices.)
    if (k1 === 'case_ocels' && k2 === 'case_ocels') return { mode: 'case-case', a: asset1, b: asset2 };

    return null;
}

const OcgraphConformanceMinerNode = memo<NodeProps<MinerNode>>((node) => {
    const primaryAsset = useMemo(
        () => node.data.assets.find((a) => a.io === 'input' && (!a.inputHandle || a.inputHandle === 'target')) ?? null,
        [node.data.assets]
    );
    const secondaryAsset = useMemo(
        () => node.data.assets.find((a) => a.io === 'input' && a.inputHandle === 'ocgraphTargetSecondary') ?? null,
        [node.data.assets]
    );

    const detected = useMemo(
        () => detectOcgraph(primaryAsset, secondaryAsset),
        [primaryAsset, secondaryAsset]
    );

    // ── ocpt-case mode ──
    const { data: ocptCaseResult, isLoading: lOcpt } = useGetConformanceOcptCaseOcelsOcgraphconf(
        detected?.mode === 'ocpt-case-ocels' ? detected.a.id : null,
        detected?.mode === 'ocpt-case-ocels' ? detected.b.id : null,
        0
    );

    // ── case-case mode ──
    const { data: caseCaseResult, isLoading: lCase } = useGetConformanceCaseCaseOcgraphconf(
        detected?.mode === 'case-case' ? detected.a.id : null,
        detected?.mode === 'case-case' ? 0 : null,
        detected?.mode === 'case-case' ? 1 : null
    );

    const result = ocptCaseResult ?? caseCaseResult;
    const isLoading = lOcpt || lCase;

    const updateNodeData = useExploreFlowStore((state) => state.updateNodeData);

    useEffect(() => {
        if (!result || !detected) return;
        updateNodeData(node.id, () => ({
            // Distinct result shape for the graph-alignment output.
            graphAlignmentResult: {
                mode: detected.mode,
                ocgraphconf: result,
                inputA: { id: detected.a.id, type: detected.a.type },
                inputB: { id: detected.b.id, type: detected.b.type },

            },
        }));
    }, [result, detected, node.id, updateNodeData]);

    // Output asset kind 'graphAlignmentAsset' → spawns graphAlignmentFileNode.
    useMinerOutput(
        node.id,
        result ? node.id : null,
        'Graph Alignment',
        'graphAlignmentAsset',
        'graphAlignmentFileNode'
    );

    return (
        <BaseMinerNode
            {...node}
            title="OCGraph Conformance"
            iconName="gitCompare"
            handleOptions={[
                { id: 'target', position: Position.Left, type: 'target' as const },
                { id: 'source', position: Position.Right, type: 'source' as const },
            ]}
            secondaryHandles={[
                {
                    id: 'ocgraphTargetSecondary',
                    label: 'Case collection',
                    hintTypes: ['ocelCollectionFile'],
                },
            ]}
            dropdownOptions={[]}
            isLoading={isLoading}
        >
            {primaryAsset && secondaryAsset && isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Computing graph alignment...
                </div>
            )}
        </BaseMinerNode>
    );
});

export default OcgraphConformanceMinerNode;