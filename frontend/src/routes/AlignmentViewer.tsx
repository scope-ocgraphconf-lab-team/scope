import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    Handle,
    Position,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import { useExploreFlowStore } from '~/stores/exploreStore';
import type { MinerExploreNodeData } from '~/types/explore/nodeData/minerNodeData';
import type {
    OcgraphconfResult,
    UnmatchedNodeDetail,
    UnmatchedEdgeDetail,
} from '~/services/api';

const COLORS = {
    matchedBorder: '#6b7280',
    matchedBg: '#f3f4f6',
    insertion: '#16a34a',
    insertionBg: '#dcfce7',
    removal: '#9ca3af',
    object: '#f59e0b',
};

interface GraphNodeData extends Record<string, unknown> {
    label: string;
    kind: string;
    status: 'matched' | 'insertion' | 'removal';
}

function GraphNodeCmp({ data }: { data: GraphNodeData }) {
    const isObject = data.kind === 'object';
    const border =
        data.status === 'matched'
            ? COLORS.matchedBorder
            : data.status === 'removal'
              ? COLORS.removal
              : COLORS.insertion;
    const bg =
        data.status === 'matched'
            ? COLORS.matchedBg
            : data.status === 'removal'
              ? '#fff'
              : COLORS.insertionBg;
    const borderStyle = data.status === 'removal' ? 'dashed' : 'solid';
    return (
        <div
            style={{
                padding: '8px 12px',
                borderRadius: isObject ? 18 : 6,
                border: `2px ${borderStyle} ${border}`,
                background: bg,
                minWidth: 70,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 500,
                color: '#111827',
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <div>{data.label}</div>
            {data.kind && <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{data.kind}</div>}
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </div>
    );
}

const nodeTypes = { graphNode: GraphNodeCmp };

function buildGraph(
    side: 'left' | 'right',
    details: OcgraphconfResult['alignment_details']
): { nodes: Node[]; edges: Edge[] } {
    if (!details) return { nodes: [], edges: [] };

    const matchedKey = side === 'left' ? 'left_node_id' : 'right_node_id';
    const matched = details.matched_nodes.map((m) => ({
        id: String(m[matchedKey]),
        status: 'matched' as const,
        label: `#${m[matchedKey]}`,
        kind: '',
    }));

    const unmatchedNodes: UnmatchedNodeDetail[] =
        side === 'left' ? details.left_unmatched_nodes : details.right_unmatched_nodes;
    const unmatched = unmatchedNodes.map((n) => ({
        id: String(n.id),
        status: (side === 'left' ? 'insertion' : 'removal') as 'insertion' | 'removal',
        label: n.label,
        kind: n.element_type,
    }));

    const nodes: Node[] = [...matched, ...unmatched].map((n) => ({
        id: n.id,
        type: 'graphNode',
        position: { x: 0, y: 0 },
        data: { label: n.label, kind: n.kind, status: n.status },
    }));

    const unmatchedEdges: UnmatchedEdgeDetail[] =
        side === 'left' ? details.left_unmatched_edges : details.right_unmatched_edges;
    const edges: Edge[] = unmatchedEdges.map((e) => {
        const isE2O = e.label.startsWith('E2O');
        return {
            id: `${side}-e${e.id}`,
            source: String(e.source_id),
            target: String(e.target_id),
            label: e.label,
            style: {
                stroke: isE2O ? COLORS.object : COLORS.insertion,
                strokeWidth: 2,
                strokeDasharray: isE2O ? '4 3' : undefined,
            },
            labelStyle: { fontSize: 10, fill: '#6b7280' },
        };
    });

    return { nodes, edges };
}

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 70 });
    g.setDefaultEdgeLabel(() => ({}));
    nodes.forEach((n) => g.setNode(n.id, { width: 90, height: 50 }));
    edges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return nodes.map((n) => {
        const p = g.node(n.id);
        return { ...n, position: { x: p.x - 45, y: p.y - 25 } };
    });
}

function Panel({
    title,
    accent,
    side,
    details,
}: {
    title: string;
    accent: string;
    side: 'left' | 'right';
    details: OcgraphconfResult['alignment_details'];
}) {
    const { nodes, edges } = useMemo(() => {
        const built = buildGraph(side, details);
        return { nodes: layoutNodes(built.nodes, built.edges), edges: built.edges };
    }, [side, details]);

    return (
        <div
            className="flex flex-col flex-1 min-h-0"
            style={{ borderRight: side === 'left' ? '1px solid #e5e7eb' : 'none' }}
        >
            <div className="px-3 py-1.5 text-xs font-semibold border-b shrink-0" style={{ color: accent }}>
                {title}
            </div>
            <div className="flex-1 min-h-0">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background gap={16} color="#f1f5f9" />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>
        </div>
    );
}

const AlignmentViewer: React.FC = () => {
    const { nodeId } = useParams<{ nodeId: string }>();
    const getNode = useExploreFlowStore((s) => s.getNode);

    const graphAlignmentResult = useMemo(() => {
        if (!nodeId) return null;
        const fileNode = getNode(nodeId);
        const minerNodeId = fileNode?.data.assets.find((a) => a.io === 'output')?.id;
        if (!minerNodeId) return null;
        return (
            (getNode(minerNodeId)?.data as MinerExploreNodeData | undefined)?.graphAlignmentResult ?? null
        );
    }, [nodeId, getNode]);

    const r = graphAlignmentResult?.ocgraphconf ?? null;
    const details = r?.alignment_details ?? null;

    return (
        <div className="flex flex-col h-screen w-full">
            <BreadcrumbNav />

            {!r ? (
                <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                    No alignment result. Run the OCGraph Conformance node first.
                </div>
            ) : (
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex gap-6 px-4 py-2.5 border-b text-xs items-center flex-wrap">
                        <strong className="text-sm">Alignment</strong>
                        <span>Cost <b>{r.alignment_cost}</b></span>
                        <span>Fitness <b>{(r.fitness * 100).toFixed(1)}%</b></span>
                        <span>
                            Nodes <b>{r.matched_node_count}</b> matched /{' '}
                            <b style={{ color: COLORS.insertion }}>{r.case_unmatched_node_count}</b> ins /{' '}
                            <b>{r.model_case_unmatched_node_count}</b> rem
                        </span>
                        <span>
                            Edges <b>{r.matched_edge_count}</b> matched /{' '}
                            <b style={{ color: COLORS.insertion }}>{r.case_unmatched_edge_count}</b> ins /{' '}
                            <b>{r.model_case_unmatched_edge_count}</b> rem
                        </span>
                    </div>

                    <div className="flex gap-4 px-4 py-1.5 border-b text-[11px] text-gray-500 items-center flex-wrap">
                        <LegendItem color={COLORS.matchedBorder} bg={COLORS.matchedBg} text="matched" />
                        <LegendItem color={COLORS.insertion} bg={COLORS.insertionBg} text="insertion (in log)" />
                        <LegendItem color={COLORS.removal} bg="#fff" dashed text="removal (in model)" />
                    </div>

                    <div className="flex flex-1 min-h-0">
                        <Panel title="G_L — log case" accent="#3b82f6" side="left" details={details} />
                        <Panel title="G_M — model case" accent="#f97316" side="right" details={details} />
                    </div>

                    <div className="px-4 py-2 border-t text-[11px]" style={{ color: '#92400e', background: '#fffbeb' }}>
                        Matched nodes show only their id; matched edges are not drawn. The backend returns
                        matched elements as bare id pairs without labels — both resolve once full-graph
                        metadata is added.
                    </div>
                </div>
            )}
        </div>
    );
};

function LegendItem({ color, bg, text, dashed }: { color: string; bg: string; text: string; dashed?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span
                style={{
                    width: 14,
                    height: 14,
                    border: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
                    background: bg,
                    borderRadius: 3,
                    display: 'inline-block',
                }}
            />
            {text}
        </span>
    );
}

export default AlignmentViewer;