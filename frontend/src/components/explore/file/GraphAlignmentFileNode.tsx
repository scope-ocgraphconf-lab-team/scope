// ============================================================================
// NEW FILE: src/components/explore/file/GraphAlignmentFileNode.tsx
// ============================================================================
// The result node for OCGraph Conformance. Reads graphAlignmentResult from the
// upstream miner node (same fileNode -> outputAsset -> minerNode resolution as
// ConformanceFileNode) and shows the meaningful ocgraphconf metrics, plus a
// "View alignment" button that routes to the new alignment viewer.
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import BaseFileNode from '~/components/explore/file/BaseFileNode';
import { Button } from '~/components/ui/button';
import { useExploreFlowStore } from '~/stores/exploreStore';
import type { FileNode } from '~/types/explore/nodes';
import type { MinerExploreNodeData } from '~/types/explore/nodeData/minerNodeData';

const GraphAlignmentFileNode = (props: NodeProps<FileNode>) => {
    const navigate = useNavigate();
    const getNode = useExploreFlowStore((state) => state.getNode);

    const outputAsset = props.data.assets.find((a) => a.io === 'output');
    const graphAlignmentResult = outputAsset
        ? (getNode(outputAsset.id)?.data as MinerExploreNodeData | undefined)?.graphAlignmentResult
        : undefined;

    const r = graphAlignmentResult?.ocgraphconf;

    return (
        <BaseFileNode
            {...props}
            title="Graph Alignment"
            iconName="gitCompare"
            handleOptions={[]}
            dropdownOptions={[]}
        >
            {r && (
                <div className="mt-2 border-t pt-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Alignment cost</span>
                            <span className="font-semibold">{r.alignment_cost}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Fitness</span>
                            <span className="font-semibold">{(r.fitness * 100).toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                            <span className="text-gray-500">Nodes (matched / ins / rem)</span>
                            <span className="font-semibold">
                                {r.matched_node_count} / {r.case_unmatched_node_count} /{' '}
                                {r.model_case_unmatched_node_count}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Edges (matched / ins / rem)</span>
                            <span className="font-semibold">
                                {r.matched_edge_count} / {r.case_unmatched_edge_count} /{' '}
                                {r.model_case_unmatched_edge_count}
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-7 px-2 text-xs"
                        onClick={() => navigate(`/data/pipeline/explore/alignment/${props.id}`)}
                    >
                        <GitCompare className="h-3.5 w-3.5 text-blue-500" />
                        View alignment
                    </Button>
                </div>
            )}
        </BaseFileNode>
    );
};

export default GraphAlignmentFileNode;