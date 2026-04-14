import { memo } from 'react';
import { Handle, type Node, NodeProps, Position } from '@xyflow/react';
import { BaseNode } from '~/components/ui/base-node';

type AbstractionEvNodeProps = {
    eventName: string;
    color: string;
    isStartEvent: boolean;
    isEndEvent: boolean;
};

const AbstractionEvNode = memo(({ data, id }: NodeProps<Node<AbstractionEvNodeProps>>) => {
    return (
        <BaseNode id={id} className="px-3 py-2 overflow-visible">
            {/* Logical anchors for edge validation — DF edges draw via floating geometry */}
            <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
            {/* Visible left handle for OtEv edges */}
            <Handle type="target" id="otev-target" position={Position.Left} style={{ visibility: 'hidden' }} />

            {data.isStartEvent && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 -top-3 px-2 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
                    style={{ backgroundColor: data.color }}
                >
                    Start
                </div>
            )}

            <p className="text-xs font-medium">{data.eventName}</p>

            {data.isEndEvent && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 -bottom-3 px-2 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
                    style={{ backgroundColor: data.color }}
                >
                    End
                </div>
            )}
        </BaseNode>
    );
});

export default AbstractionEvNode;
