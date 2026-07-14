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

function buildMergedGraph(
    details: OcgraphconfResult['alignment_details']
): { nodes: Node[]; edges: BuiltEdge[] } {
    if (!details) return { nodes: [], edges: [] };

    const leftUnmatched = new Set(details.left_unmatched_node_ids);
    const rightUnmatched = new Set(details.right_unmatched_node_ids);
    const leftEdgeUnmatched = new Set(details.left_unmatched_edge_ids);
    const rightEdgeUnmatched = new Set(details.right_unmatched_edge_ids);

    const matchedNodes: Node[] = details.left_graph_nodes
        .filter((n) => !leftUnmatched.has(n.id))
        .map((n) => ({
            id: `m-${n.id}`,
            type: 'graphNode',
            position: { x: 0, y: 0 },
            data: { label: n.label, kind: n.element_type, status: 'matched' as const },
        }));

    const leftNodes: Node[] = details.left_graph_nodes
        .filter((n) => leftUnmatched.has(n.id))
        .map((n) => ({
            id: `l-${n.id}`,
            type: 'graphNode',
            position: { x: 0, y: 0 },
            data: { label: n.label, kind: n.element_type, status: 'insertion' as const },
        }));

    const rightNodes: Node[] = details.right_graph_nodes
        .filter((n) => rightUnmatched.has(n.id))
        .map((n) => ({
            id: `r-${n.id}`,
            type: 'graphNode',
            position: { x: 0, y: 0 },
            data: { label: n.label, kind: n.element_type, status: 'removal' as const },
        }));

    const nodes = [...matchedNodes, ...leftNodes, ...rightNodes];

    const resolveId = (id: number, isLeft: boolean, unmatchedSet: Set<number>) => {
        if (unmatchedSet.has(id)) return isLeft ? `l-${id}` : `r-${id}`;
        return `m-${id}`;
    };

    const matchedEdges: BuiltEdge[] = details.left_graph_edges
        .filter((e) => !leftEdgeUnmatched.has(e.id))
        .map((e) => ({
            id: `me-${e.id}`,
            source: resolveId(e.source_id, true, leftUnmatched),
            target: resolveId(e.target_id, true, leftUnmatched),
            label: e.label,
            data: { isDF: e.element_type !== 'e2o' },
            style: {
                stroke: e.element_type === 'e2o' ? COLORS.object : COLORS.matchedBorder,
                strokeWidth: 2,
                strokeDasharray: e.element_type === 'e2o' ? '4 3' : undefined,
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: e.element_type === 'e2o' ? COLORS.object : COLORS.matchedBorder },
            labelStyle: { fontSize: 10, fill: '#6b7280' },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
            labelBgPadding: [2, 2] as [number, number],
        }));

    const leftEdges: BuiltEdge[] = details.left_graph_edges
        .filter((e) => leftEdgeUnmatched.has(e.id))
        .map((e) => ({
            id: `le-${e.id}`,
            source: resolveId(e.source_id, true, leftUnmatched),
            target: resolveId(e.target_id, true, leftUnmatched),
            label: e.label,
            data: { isDF: e.element_type !== 'e2o' },
            style: { stroke: COLORS.insertion, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: COLORS.insertion },
            labelStyle: { fontSize: 10, fill: '#6b7280' },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
            labelBgPadding: [2, 2] as [number, number],
        }));

    const rightEdges: BuiltEdge[] = details.right_graph_edges
        .filter((e) => rightEdgeUnmatched.has(e.id))
        .map((e) => ({
            id: `re-${e.id}`,
            source: resolveId(e.source_id, false, rightUnmatched),
            target: resolveId(e.target_id, false, rightUnmatched),
            label: e.label,
            data: { isDF: e.element_type !== 'e2o' },
            style: { stroke: COLORS.removal, strokeWidth: 2, strokeDasharray: '4 3' },
            markerEnd: { type: MarkerType.ArrowClosed, color: COLORS.removal },
            labelStyle: { fontSize: 10, fill: '#6b7280' },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
            labelBgPadding: [2, 2] as [number, number],
        }));

    const edges = [...matchedEdges, ...leftEdges, ...rightEdges];
    return { nodes, edges };
}

function layoutNodes(nodes: Node[], edges: BuiltEdge[]): Node[] {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 180, edgesep: 40 });
    g.setDefaultEdgeLabel(() => ({}));
    nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    edges.filter((e) => e.data.isDF).forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return nodes.map((n) => {
        const p = g.node(n.id);
        if (!p) return { ...n, position: { x: 0, y: 0 } };
        return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
    });
}

function MergedPanel({ details }: { details: OcgraphconfResult['alignment_details'] }) {
    const initial = useMemo(() => {
        const built = buildMergedGraph(details);
        return { nodes: layoutNodes(built.nodes, built.edges), edges: built.edges };
    }, [details]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);

    useEffect(() => {
        setNodes(initial.nodes);
    }, [initial.nodes, setNodes]);

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 py-1.5 text-xs font-semibold border-b shrink-0" style={{ color: '#6b7280' }}>
                Merged alignment graph
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

    const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);

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
    const hasPrecision = result.precision != null;
    const isCaseCase = mode === 'case-case';
    const nodeInsertions = result.left_unmatched_node_count;
    const nodeRemovals = result.right_unmatched_node_count;
    const edgeInsertions = result.left_unmatched_edge_count;
    const edgeRemovals = result.right_unmatched_edge_count;
    
    const leftNodes = result.left_case_nodes;
    const rightNodes = result.right_case_nodes;
    const leftEdges = result.left_case_edges;
    const rightEdges = result.right_case_edges;
    
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
                                    <CaseSelector caseCount={caseCount} selectedCaseIndex={leftIndex} onSelect={onSelectLeft} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Right case (G_R)</span>
                                    <CaseSelector caseCount={caseCount} selectedCaseIndex={rightIndex} onSelect={onSelectRight} />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Case compared against the model</span>
                                <CaseSelector caseCount={caseCount} selectedCaseIndex={leftIndex} onSelect={onSelectLeft} />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alignment</p>
                        <StatRow label="GED cost" value={String(result.alignment_cost)} />
                        <StatRow label="Fitness" value={fitnessPct} />
                        {hasPrecision && (
                            <StatRow label="Precision" value={`${(result.precision! * 100).toFixed(1)}%`} />
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nodes</p>
                        <StatRow label="Matched" value={String(result.matched_node_count)} valueColor={COLORS.matchedBorder} />
                        <StatRow label={isCaseCase ? 'Only in left' : 'Insertions (log)'} value={String(nodeInsertions ?? 0)} valueColor={COLORS.insertion} />
                        <StatRow label={isCaseCase ? 'Only in right' : 'Removals (model)'} value={String(nodeRemovals ?? 0)} valueColor={COLORS.removal} />
                        <div className="border-t pt-1 flex justify-between text-xs">
                            {/* <span className="text-muted-foreground">G_L / G_M total</span> */}
                            <span className="text-muted-foreground">{isCaseCase ? 'G_L / G_R total' : 'G_L / G_M total'}</span>
                            <span className="font-semibold">{leftNodes ?? 0} / {rightNodes ?? 0}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edges</p>
                        <StatRow label="Matched" value={String(result.matched_edge_count)} valueColor={COLORS.matchedBorder} />
                        <StatRow label={isCaseCase ? 'Only in left' : 'Insertions (log)'} value={String(edgeInsertions ?? 0)} valueColor={COLORS.insertion} />
                        <StatRow label={isCaseCase ? 'Only in right' : 'Removals (model)'} value={String(edgeRemovals ?? 0)} valueColor={COLORS.removal} />
                        <div className="border-t pt-1 flex justify-between text-xs">
                            {/* <span className="text-muted-foreground">G_L / G_M total</span> */}
                            <span className="text-muted-foreground">{isCaseCase ? 'G_L / G_R total' : 'G_L / G_M total'}</span>
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
    const caseCollectionId =
        stored?.mode === 'ocpt-case-ocels' ? stored?.inputB.id ?? null : collectionId;

    const [leftIndex, setLeftIndex] = useState<number>(stored?.ocgraphconf.case_index ?? 0);
    const [rightIndex, setRightIndex] = useState<number>(1);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showMerged, setShowMerged] = useState(false);

    const { data: collection } = useGetOcelCollection(caseCollectionId);
    const caseCount = collection?.case_ocels.length ?? 0;

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
                    {/* <button
                        onClick={() => setShowMerged((v) => !v)}
                        style={{
                            marginLeft: 'auto',
                            fontSize: 11,
                            padding: '2px 10px',
                            borderRadius: 4,
                            border: '1px solid #e5e7eb',
                            background: showMerged ? '#fef9c3' : '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        {showMerged ? 'Show split view' : 'Show merged view'}
                    </button> */}
                </div>

                <div className="flex flex-1 min-h-0">
                    <div className={`relative flex flex-1 min-h-0 transition-all duration-200 ${sidebarOpen ? 'mr-72' : 'mr-0'}`}>
                        <button
                            onClick={() => setShowMerged((v) => !v)}
                            className="absolute left-1/2 -translate-x-1/2 z-20"
                            style={{
                                top: 44,
                                fontSize: 11,
                                padding: '3px 12px',
                                borderRadius: 6,
                                border: '1px solid #e5e7eb',
                                background: showMerged ? '#fef9c3' : '#fff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                cursor: 'pointer',
                            }}
                        >
                            {showMerged ? 'Show split view' : 'Show merged view'}
                        </button>
                        {showMerged ? (
                            <MergedPanel details={details} />
                        ) : (
                            <>
                                <Panel title="G_L — log case" accent="#3b82f6" side="left" details={details} />
                                {/* <Panel title="G_M — model case" accent="#f97316" side="right" details={details} /> */}
                                <Panel title={mode === 'case-case' ? 'G_M — log case' : 'G_M — model case'} accent="#f97316" side="right" details={details} />
                            </>
                        )}
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