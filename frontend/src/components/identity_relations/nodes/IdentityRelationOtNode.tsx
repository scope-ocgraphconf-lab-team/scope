import { memo } from 'react';
import { Handle, type Node, NodeProps, Position } from '@xyflow/react';
import { BaseNode } from '~/components/ui/base-node';

// Dagre layout estimates — actual size is determined by BaseNode content
export const OT_NODE_W = 120;
export const OT_NODE_H = 34;

type IdentityRelationOtNodeProps = {
    objectType: string;
    color: string;
};

const IdentityRelationOtNode = memo(({ data, id }: NodeProps<Node<IdentityRelationOtNodeProps>>) => (
    <BaseNode id={id} className="px-3 py-2" style={{ borderColor: data.color }}>
        <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />
        <p className="text-xs font-medium" style={{ color: data.color }}>{data.objectType}</p>
    </BaseNode>
));
IdentityRelationOtNode.displayName = 'IdentityRelationOtNode';

export default IdentityRelationOtNode;
