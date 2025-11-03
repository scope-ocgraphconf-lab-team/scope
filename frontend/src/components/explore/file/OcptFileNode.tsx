import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import BaseFileNode from '~/components/explore/file/BaseFileNode';
import { FileNode } from '~/types/explore/nodes';

const OcptFileNode = memo<NodeProps<FileNode>>((props) => {
    return (
        <BaseFileNode
            {...props}
            title="OCPT File"
            iconName="fileJson"
            handleOptions={[{ position: Position.Right, type: 'source' as const }]}
            dropdownOptions={[{ label: 'Open File', action: 'openFileDialog' as const }]}
        />
    );
});

export default OcptFileNode;
