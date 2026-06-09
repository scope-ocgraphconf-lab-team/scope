import { memo, useEffect, useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import {
    Background,
    Controls,
    MarkerType,
    Panel,
    ReactFlow,
    useEdgesState,
    useNodesState,
    Handle,
    Position,
    type Edge,
    type Node,
    type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { IdentityRelationEdge, HubEdge, EDGE_COLOR } from '~/components/identity_relations/edges/IdentityRelationEdge';
import IdentityRelationOtNode, { OT_NODE_W, OT_NODE_H } from '~/components/identity_relations/nodes/IdentityRelationOtNode';
import type { IdentityRelationKind } from '~/types/ocpt/ocpt.types';

export interface IdentityRelationItem {
    id?: string;
    left: string[];
    right: string[];
    kind: IdentityRelationKind;
    activities?: string[];
}

export interface IdentityRelationViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    objectTypes: string[];
    relations: IdentityRelationItem[];
    getObjectColor: (ot: string) => string;
}

const KIND_LABELS: Record<IdentityRelationKind, string> = {
    sync: 'Synchronization',
    impConcurrent: 'Implicit Concurrency',
    tempImp: 'Temporal Implication',
};

const KIND_SYMBOLS: Record<IdentityRelationKind, string> = {
    sync: '=',
    impConcurrent: '⇒‖',
    tempImp: '⇒→',
};

const HUB_SIZE = 8;
const DAGRE_OPTS = { rankdir: 'LR', nodesep: 30, ranksep: 80 } as const;

const ARROW_MARKER = { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 16, height: 16 } as const;

// --- Hub node ---

const HubNode = memo(({ }: NodeProps<Node<Record<string, never>>>) => (
    <div
        style={{ width: HUB_SIZE, height: HUB_SIZE, borderRadius: '50%', background: '#9ca3af' }}
        className="nodrag"
    >
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
));
HubNode.displayName = 'HubNode';

const nodeTypes = { otNode: IdentityRelationOtNode, hubNode: HubNode };
const edgeTypes = { identityRelEdge: IdentityRelationEdge, hubEdge: HubEdge };

// --- Flow graph builder ---

function buildFlowGraph(
    objectTypes: string[],
    relations: IdentityRelationItem[],
    getObjectColor: (ot: string) => string,
): { nodes: Node[]; edges: Edge[] } {
    if (objectTypes.length === 0) return { nodes: [], edges: [] };

    const g = new dagre.graphlib.Graph();
    g.setGraph(DAGRE_OPTS);
    g.setDefaultEdgeLabel(() => ({}));

    objectTypes.forEach((ot) => g.setNode(ot, { width: OT_NODE_W, height: OT_NODE_H }));

    const nodes: Node[] = objectTypes.map((ot) => ({
        id: ot,
        type: 'otNode' as const,
        position: { x: 0, y: 0 },
        data: { objectType: ot, color: getObjectColor(ot) },
        draggable: false,
    }));

    const edges: Edge[] = [];

    relations.forEach((rel, i) => {
        // Left side: OT → hub keeps OTs left of hub in LR layout
        let sourceId: string;
        if (rel.left.length === 1) {
            sourceId = rel.left[0];
        } else {
            const hubId = `hub-left-${i}`;
            g.setNode(hubId, { width: HUB_SIZE, height: HUB_SIZE });
            nodes.push({ id: hubId, type: 'hubNode' as const, position: { x: 0, y: 0 }, data: {}, draggable: false });
            rel.left.forEach((ot) => {
                g.setEdge(ot, hubId);
                edges.push({ id: `${hubId}-${ot}`, source: ot, target: hubId, type: 'hubEdge' as const, data: {} });
            });
            sourceId = hubId;
        }

        // Right side: hub → OT keeps OTs right of hub in LR layout
        let targetId: string;
        if (rel.right.length === 1) {
            targetId = rel.right[0];
        } else {
            const hubId = `hub-right-${i}`;
            g.setNode(hubId, { width: HUB_SIZE, height: HUB_SIZE });
            nodes.push({ id: hubId, type: 'hubNode' as const, position: { x: 0, y: 0 }, data: {}, draggable: false });
            rel.right.forEach((ot) => {
                g.setEdge(hubId, ot);
                edges.push({ id: `${hubId}-${ot}`, source: hubId, target: ot, type: 'hubEdge' as const, data: {} });
            });
            targetId = hubId;
        }

        g.setEdge(sourceId, targetId);
        edges.push({
            id: rel.id ?? `rel-${i}`,
            source: sourceId,
            target: targetId,
            type: 'identityRelEdge' as const,
            data: { kind: rel.kind, activities: rel.activities },
            markerEnd: ARROW_MARKER,
            markerStart: rel.kind === 'sync' ? ARROW_MARKER : undefined,
        });
    });

    dagre.layout(g);

    nodes.forEach((node) => {
        const dn = g.node(node.id);
        const w = node.id.startsWith('hub-') ? HUB_SIZE : OT_NODE_W;
        const h = node.id.startsWith('hub-') ? HUB_SIZE : OT_NODE_H;
        node.position = { x: dn.x - w / 2, y: dn.y - h / 2 };
    });

    return { nodes, edges };
}

// --- Main component ---

const IdentityRelationViewer: React.FC<IdentityRelationViewerProps> = ({
    open,
    onOpenChange,
    title,
    objectTypes,
    relations,
    getObjectColor,
}) => {
    const visibleRelations = useMemo(
        () => relations.filter((r) => r.kind != null),
        [relations],
    );

    const presentKinds = useMemo(
        () => Array.from(new Set(visibleRelations.map((r) => r.kind))) as IdentityRelationKind[],
        [visibleRelations],
    );

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildFlowGraph(objectTypes, visibleRelations, getObjectColor),
        [objectTypes, visibleRelations, getObjectColor],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl flex flex-col" style={{ height: '80vh' }}>
                <DialogHeader className="shrink-0">
                    <DialogTitle>
                        Identity Relations{title ? ` — ${title}` : ''}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
                    {objectTypes.length === 0 ? (
                        <p className="text-sm text-muted-foreground h-full flex items-center justify-center">
                            No object types at this node.
                        </p>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                        >
                            <Background />
                            <Controls position="top-left" />
                            {presentKinds.length > 0 && (
                                <Panel position="bottom-left">
                                    <div className="bg-background/90 backdrop-blur-sm rounded-md border px-3 py-2 flex flex-col gap-1">
                                        {presentKinds.map((kind) => (
                                            <div key={kind} className="flex items-center gap-2 text-xs">
                                                <span className="font-mono bg-indigo-50 text-indigo-600 rounded px-1 shrink-0">
                                                    {KIND_SYMBOLS[kind]}
                                                </span>
                                                <span className="text-muted-foreground">{KIND_LABELS[kind]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                            )}
                        </ReactFlow>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default IdentityRelationViewer;
