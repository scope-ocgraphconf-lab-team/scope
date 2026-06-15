import { useEffect, useMemo } from 'react';
import { Background, Controls, type Edge, type Node, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { GraphConformanceResponse } from '~/services/response.types';

interface AlignmentGraphProps {
    conformanceData: GraphConformanceResponse;
}

const toAlignmentFlow = (data: GraphConformanceResponse): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (!data || !data.optimal_assignment) {
        return { nodes, edges };
    }

    const { insertions, removals } = data.optimal_assignment;

    // Intersections
    insertions.forEach((item, index) => {
        if (item.element_type === 'node') {
            nodes.push({
                id: `ins-node-${index}`,
                position: { x: 100, y: index * 80 }, 
                data: { label: item.label },
                style: { 
                    border: '2px solid #22c55e', 
                    backgroundColor: '#ecfdf5',
                    color: '#15803d',
                    fontWeight: 'bold'
                } 
            });
        } else if (item.element_type === 'edge') {
            edges.push({
                id: `ins-edge-${index}`,
                source: item.source_node || '',
                target: item.target_node || '',
                label: item.label,
                style: { stroke: '#22c55e', strokeWidth: 3 }, 
                animated: true 
            });
        }
    });

    // Removals
    removals.forEach((item, index) => {
        if (item.element_type === 'node') {
            nodes.push({
                id: `rem-node-${index}`,
                position: { x: 300, y: index * 80 }, 
                data: { label: item.label },
                style: { 
                    border: '2px dashed #9ca3af', 
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                } 
            });
        } else if (item.element_type === 'edge') {
            edges.push({
                id: `rem-edge-${index}`,
                source: item.source_node || '',
                target: item.target_node || '',
                label: item.label,
                style: { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: '5,5' } 
            });
        }
    });

    return { nodes, edges };
};

const AlignmentGraph: React.FC<AlignmentGraphProps> = ({ conformanceData }) => {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => toAlignmentFlow(conformanceData),
        [conformanceData]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [setNodes, setEdges, initialNodes, initialEdges]);

    return (
        <div className="h-full w-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background />
                <Controls position="top-left" />
            </ReactFlow>
        </div>
    );
};

export default AlignmentGraph;