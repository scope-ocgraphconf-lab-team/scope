import { memo } from 'react';
import { Handle, type Node, NodeProps, Position } from '@xyflow/react';
import { BaseNode } from '~/components/ui/base-node';

type AbstractionEvNodeProps = {
    eventName: string;
    isStartEvent: boolean;
    isEndEvent: boolean;
};

const AbstractionEvNode = memo(({ data, id }: NodeProps<Node<AbstractionEvNodeProps>>) => {
    return (
        <BaseNode id={id}>
            {/* Logical anchors for edge validation — DF edges draw via floating geometry */}
            <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
            {/* Visible left handle for OtEv edges */}
            <Handle type="target" id="otev-target" position={Position.Left} style={{ visibility: 'hidden' }} />
            <p className="text-xs font-medium px-1">{data?.eventName}</p>
        </BaseNode>
    );
});

export default AbstractionEvNode;
