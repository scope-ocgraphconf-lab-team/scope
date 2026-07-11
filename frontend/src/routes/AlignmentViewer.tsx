import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    Handle,
    Position,
    useNodesState,
    MarkerType,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import { CaseSelector } from '~/components/CaseSelector';
import { useExploreFlowStore } from '~/stores/exploreStore';
import {
    useGetConformanceOcptCaseOcelsOcgraphconf,
    useGetConformanceCaseCaseOcgraphconf,
    useGetOcelCollection,
} from '~/services/queries';
import type { MinerExploreNodeData } from '~/types/explore/nodeData/minerNodeData';
import type { OcgraphconfResult } from '~/services/api';

const COLORS = {
    matchedBorder: '#d97706',
    matchedBg: '#fef9c3',
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
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isUnmatched ? deviationColor : (isE2O ? COLORS.object : COLORS.matchedBorder),
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
    const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);

    // When the alignment result changes (e.g. the user picked a different case),
    // reset the nodes to the freshly laid-out graph instead of keeping stale drags.
    useEffect(() => {
        setNodes(initial.nodes);
    }, [initial.nodes, setNodes]);

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

// ── Sidebar ────────────────────────────────────────────────────────────────
// Cost / fitness / precision plus the node/edge deviation breakdown, and the
// case-index selector(s) that let the user re-run the alignment against a
// different case. Visual language matches DeviationSidebar (collapsible right
// panel, muted uppercase section headers).

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold" style={valueColor ? { color: valueColor } : undefined}>
                {value}
            </span>
        </div>
    );
}

function AlignmentSidebar({
    open,
    onToggle,
    mode,
    result,
    isFetching,
    caseCount,
    leftIndex,
    rightIndex,
    onSelectLeft,
    onSelectRight,
}: {
    open: boolean;
    onToggle: () => void;
    mode: 'ocpt-case-ocels' | 'case-case';
    result: OcgraphconfResult;
    isFetching: boolean;
    caseCount: number;
    leftIndex: number;
    rightIndex: number;
    onSelectLeft: (i: number) => void;
    onSelectRight: (i: number) => void;
}) {
    const fitnessPct = `${(result.fitness * 100).toFixed(1)}%`;
    // Precision is still null on the backend; hide the row entirely rather than
    // showing a permanent placeholder. It reappears once the field is populated.
    const hasPrecision = result.precision != null;

    // The two backend paths name the same quantities differently: model-case
    // uses case_/model_case_, case-case uses left_/right_. Normalize here so the
    // rows below always read defined numbers regardless of mode.
    const isCaseCase = mode === 'case-case';
    const nodeInsertions = isCaseCase ? result.left_unmatched_node_count : result.case_unmatched_node_count;
    const nodeRemovals = isCaseCase ? result.right_unmatched_node_count : result.model_case_unmatched_node_count;
    const edgeInsertions = isCaseCase ? result.left_unmatched_edge_count : result.case_unmatched_edge_count;
    const edgeRemovals = isCaseCase ? result.right_unmatched_edge_count : result.model_case_unmatched_edge_count;
    const leftNodes = isCaseCase ? result.left_case_nodes : result.case_nodes;
    const rightNodes = isCaseCase ? result.right_case_nodes : result.model_case_nodes;
    const leftEdges = isCaseCase ? result.left_case_edges : result.case_edges;
    const rightEdges = isCaseCase ? result.right_case_edges : result.model_case_edges;

    return (
        <div
            className={`absolute right-0 top-0 h-full flex z-10 transition-transform duration-200 ease-in-out ${
                open ? 'translate-x-0' : 'translate-x-72'
            }`}
        >
            <button
                onClick={onToggle}
                className="self-start mt-4 flex items-center justify-center w-6 h-8 rounded-l-md border border-r-0 bg-background shadow-md hover:bg-muted transition-colors"
                title={open ? 'Collapse panel' : 'Expand panel'}
            >
                {open ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>

            <div className="w-72 h-full bg-background border-l shadow-lg flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                    {/* Case selection */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {mode === 'case-case' ? 'Cases Compared' : 'Case Checked'}
                            </p>
                            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        </div>

                        {mode === 'case-case' ? (
                            <>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Left case (G_L)</span>
                                    <CaseSelector
                                        caseCount={caseCount}
                                        selectedCaseIndex={leftIndex}
                                        onSelect={onSelectLeft}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Right case (G_M)</span>
                                    <CaseSelector
                                        caseCount={caseCount}
                                        selectedCaseIndex={rightIndex}
                                        onSelect={onSelectRight}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">
                                    Case compared against the model
                                </span>
                                <CaseSelector
                                    caseCount={caseCount}
                                    selectedCaseIndex={leftIndex}
                                    onSelect={onSelectLeft}
                                />
                            </div>
                        )}
                    </div>

                    {/* Alignment metrics */}
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Alignment
                        </p>
                        <StatRow label="GED cost" value={String(result.alignment_cost)} />
                        <StatRow label="Fitness" value={fitnessPct} />
                         {hasPrecision && (
                            <StatRow label="Precision" value={`${(result.precision! * 100).toFixed(1)}%`} />
                        )}
                    </div>

                    {/* Node breakdown */}
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Nodes
                        </p>
                        <StatRow label="Matched" value={String(result.matched_node_count)} valueColor={COLORS.matchedBorder} />
                        <StatRow label={isCaseCase ? 'Only in left' : 'Insertions (log)'} value={String(nodeInsertions ?? 0)} valueColor={COLORS.insertion} />
                        <StatRow label={isCaseCase ? 'Only in right' : 'Removals (model)'} value={String(nodeRemovals ?? 0)} valueColor={COLORS.removal} />
                        <div className="border-t pt-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">G_L / G_M total</span>
                            <span className="font-semibold">{leftNodes ?? 0} / {rightNodes ?? 0}</span>
                        </div>
                    </div>

                    {/* Edge breakdown */}
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Edges
                        </p>
                        <StatRow label="Matched" value={String(result.matched_edge_count)} valueColor={COLORS.matchedBorder} />
                        <StatRow label={isCaseCase ? 'Only in left' : 'Insertions (log)'} value={String(edgeInsertions ?? 0)} valueColor={COLORS.insertion} />
                        <StatRow label={isCaseCase ? 'Only in right' : 'Removals (model)'} value={String(edgeRemovals ?? 0)} valueColor={COLORS.removal} />
                        <div className="border-t pt-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">G_L / G_M total</span>
                            <span className="font-semibold">{leftEdges ?? 0} / {rightEdges ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const AlignmentViewer: React.FC = () => {
    const { nodeId } = useParams<{ nodeId: string }>();
    const getNode = useExploreFlowStore((s) => s.getNode);

    // The miner node computed an initial alignment and stashed it (with the
    // input ids and mode) in the store. We seed from that, then let the viewer
    // own the case indices and re-fetch as they change.
    const stored = useMemo(() => {
        if (!nodeId) return null;
        const fileNode = getNode(nodeId);
        const minerNodeId = fileNode?.data?.assets?.find((a) => a.io === 'output')?.id;
        if (!minerNodeId) return null;
        return (
            (getNode(minerNodeId)?.data as MinerExploreNodeData | undefined)?.graphAlignmentResult ?? null
        );
    }, [nodeId, getNode]);

    const mode = stored?.mode ?? null;
    const collectionId = stored?.inputA.id ?? null;
    const modelId = stored?.mode === 'ocpt-case-ocels' ? stored.inputA.id : null;
    // For ocpt-case the collection is inputB; for case-case it's inputA.
    const caseCollectionId =
        stored?.mode === 'ocpt-case-ocels' ? stored?.inputB.id ?? null : collectionId;

    // Indices, seeded from whatever the miner originally computed.
    const [leftIndex, setLeftIndex] = useState<number>(stored?.ocgraphconf.case_index ?? 0);
    const [rightIndex, setRightIndex] = useState<number>(1);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // How many cases the collection holds — bounds the selector.
    const { data: collection } = useGetOcelCollection(caseCollectionId);
    const caseCount = collection?.case_ocels.length ?? 0;

    // Viewer-owned fetches. Only the hook matching the current mode is enabled.
    const ocptQuery = useGetConformanceOcptCaseOcelsOcgraphconf(
        mode === 'ocpt-case-ocels' ? modelId : null,
        mode === 'ocpt-case-ocels' ? caseCollectionId : null,
        leftIndex
    );
    const caseQuery = useGetConformanceCaseCaseOcgraphconf(
        mode === 'case-case' ? caseCollectionId : null,
        mode === 'case-case' ? leftIndex : null,
        mode === 'case-case' ? rightIndex : null
    );

    // Prefer the live query result; fall back to the miner's stored result on
    // first paint before the viewer's own fetch resolves.
    const liveResult = mode === 'ocpt-case-ocels' ? ocptQuery.data : caseQuery.data;
    const isFetching = mode === 'ocpt-case-ocels' ? ocptQuery.isFetching : caseQuery.isFetching;
    const r = liveResult ?? stored?.ocgraphconf ?? null;
    const details = r?.alignment_details ?? null;

    if (!stored || !r || !mode) {
        return (
            <div className="flex flex-col h-screen w-full">
                <BreadcrumbNav />
                <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                    No alignment result. Run the OCGraph Conformance node first.
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full">
            <BreadcrumbNav />

            <div className="flex flex-col flex-1 min-h-0 relative">
                <div className="flex gap-4 px-4 py-1.5 border-b text-[11px] text-gray-500 items-center flex-wrap">
                    <LegendItem color={COLORS.matchedBorder} bg={COLORS.matchedBg} text="matched" />
                    <LegendItem color={COLORS.insertion} bg={COLORS.insertionBg} text="insertion (in log)" />
                    <LegendItem color={COLORS.removal} bg="#fff" dashed text="removal (in model)" />
                    <LegendLine color={COLORS.matchedBorder} text="DF (sequence)" />
                    <LegendLine color={COLORS.object} dashed text="E2O (event→object)" />
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Right padding so graphs aren't hidden behind the open sidebar. */}
                    <div className={`flex flex-1 min-h-0 transition-all duration-200 ${sidebarOpen ? 'mr-72' : 'mr-0'}`}>
                        <Panel title="G_L — log case" accent="#3b82f6" side="left" details={details} />
                        <Panel title="G_M — model case" accent="#f97316" side="right" details={details} />
                    </div>

                    <AlignmentSidebar
                        open={sidebarOpen}
                        onToggle={() => setSidebarOpen((o) => !o)}
                        mode={mode}
                        result={r}
                        isFetching={isFetching}
                        caseCount={caseCount}
                        leftIndex={leftIndex}
                        rightIndex={rightIndex}
                        onSelectLeft={setLeftIndex}
                        onSelectRight={setRightIndex}
                    />
                </div>
            </div>
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
