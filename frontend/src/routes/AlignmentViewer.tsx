import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    Handle,
    Position,
    useNodesState,
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
} from '~/services/api';

const COLORS = {
    matchedBorder: '#6b7280',
    matchedBg: '#f3f4f6',
    insertion: '#16a34a',
    insertionBg: '#dcfce7',
    removal: '#9ca3af',
    object: '#f59e0b',
};

// Node box size — kept in one place so the renderer and the dagre layout agree.
const NODE_W = 120;
const NODE_H = 60;

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
                width: NODE_W,
                minHeight: NODE_H,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
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

// Edge carries isDF so the layout can rank on DF edges only (E2O edges shouldn't influence left-to-right order, otherwise object nodes get pulled into the event row).
type BuiltEdge = Edge & { data: { isDF: boolean } };

function buildGraph(
    side: 'left' | 'right',
    details: OcgraphconfResult['alignment_details']
): { nodes: Node[]; edges: BuiltEdge[] } {
    if (!details) return { nodes: [], edges: [] };

    const graphNodes = side === 'left' ? details.left_graph_nodes : details.right_graph_nodes;
    const graphEdges = side === 'left' ? details.left_graph_edges : details.right_graph_edges;
    const unmatchedNodeIds = new Set(
        side === 'left' ? details.left_unmatched_node_ids : details.right_unmatched_node_ids
    );
    const unmatchedEdgeIds = new Set(
        side === 'left' ? details.left_unmatched_edge_ids : details.right_unmatched_edge_ids
    );

    // Every node now carries a real label + kind; status comes from id-set membership.
    const nodes: Node[] = graphNodes.map((n) => ({
        id: String(n.id),
        type: 'graphNode',
        position: { x: 0, y: 0 },
        data: {
            label: n.label,
            kind: n.element_type,
            status: unmatchedNodeIds.has(n.id)
                ? (side === 'left' ? 'insertion' : 'removal')
                : 'matched',
        },
    }));

    // All edges drawn now — matched edges included. Style by element_type, not label parsing.
    const edges: BuiltEdge[] = graphEdges.map((e) => {
        const isE2O = e.element_type === 'e2o';
        const isUnmatched = unmatchedEdgeIds.has(e.id);
        const deviationColor = side === 'left' ? COLORS.insertion : COLORS.removal;
        return {
            id: `${side}-e${e.id}`,
            source: String(e.source_id),
            target: String(e.target_id),
            label: e.label,
            data: { isDF: !isE2O },
            style: {
                stroke: isUnmatched ? deviationColor : (isE2O ? COLORS.object : COLORS.matchedBorder),
                strokeWidth: 2,
                strokeDasharray: side === 'right' && isUnmatched ? '4 3' : (isE2O ? '4 3' : undefined),
            },
            labelStyle: { fontSize: 10, fill: '#6b7280' },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
            labelBgPadding: [2, 2] as [number, number],
        };
    });

    return { nodes, edges };
}

function layoutNodes(nodes: Node[], edges: BuiltEdge[]): Node[] {
    const g = new dagre.graphlib.Graph();
    // Generous separation so the long edge labels ("E2O (Event to Object)") don't collide.
    g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 180, edgesep: 40 });
    g.setDefaultEdgeLabel(() => ({}));
    nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    // Only DF edges define rank order; E2O edges just render between placed endpoints.
    edges.filter((e) => e.data.isDF).forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return nodes.map((n) => {
        const p = g.node(n.id);
        // Fall back to origin if a node has no DF edges and dagre didn't place it.
        if (!p) return { ...n, position: { x: 0, y: 0 } };
        return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
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
    const initial = useMemo(() => {
        const built = buildGraph(side, details);
        return { nodes: layoutNodes(built.nodes, built.edges), edges: built.edges };
    }, [side, details]);

    // useNodesState makes drags persist; onNodesChange feeds position updates back in.
    const [nodes, , onNodesChange] = useNodesState(initial.nodes);

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
                    edges={initial.edges}
                    onNodesChange={onNodesChange}
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
        const minerNodeId = fileNode?.data?.assets?.find((a) => a.io === 'output')?.id;
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
                        <LegendLine color={COLORS.matchedBorder} text="DF (sequence)" />
                        <LegendLine color={COLORS.object} dashed text="E2O (event→object)" />
                    </div>

                    <div className="flex flex-1 min-h-0">
                        <Panel title="G_L — log case" accent="#3b82f6" side="left" details={details} />
                        <Panel title="G_M — model case" accent="#f97316" side="right" details={details} />
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

function LegendLine({ color, dashed, text }: { color: string; dashed?: boolean; text: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span style={{ width: 20, height: 0, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`, display: 'inline-block' }} />
            {text}
        </span>
    );
}

export default AlignmentViewer;