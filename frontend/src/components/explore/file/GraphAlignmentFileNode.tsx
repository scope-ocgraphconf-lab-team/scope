// Result node for OCGraph Conformance: reads graphAlignmentResult from the upstream
// miner node and links to the alignment viewer.

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
    // Model-case and case-case responses name the same counts differently; pick
    // the right field per mode so neither path renders "undefined".
    const isCaseCase = graphAlignmentResult?.mode === 'case-case';
    const nodeIns = isCaseCase ? r?.left_unmatched_node_count : r?.case_unmatched_node_count;
    const nodeRem = isCaseCase ? r?.right_unmatched_node_count : r?.model_case_unmatched_node_count;
    const edgeIns = isCaseCase ? r?.left_unmatched_edge_count : r?.case_unmatched_edge_count;
    const edgeRem = isCaseCase ? r?.right_unmatched_edge_count : r?.model_case_unmatched_edge_count;

    // A short description of what this alignment compares, so the user knows
    // what "View alignment" will open. Cases shown 1-based to match the selector.
    const comparedLabel = !r
        ? null
        : isCaseCase
          ? `Case ${(r.left_case_index ?? 0) + 1} vs Case ${(r.right_case_index ?? 0) + 1}`
          : `Case ${(r.case_index ?? 0) + 1} vs model`;

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
                        {comparedLabel && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Compared</span>
                                <span className="font-semibold">{comparedLabel}</span>
                            </div>
                        )}
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
                                {r.matched_node_count} / {nodeIns ?? 0} / {nodeRem ?? 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Edges (matched / ins / rem)</span>
                            <span className="font-semibold">
                                {r.matched_edge_count} / {edgeIns ?? 0} / {edgeRem ?? 0}
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