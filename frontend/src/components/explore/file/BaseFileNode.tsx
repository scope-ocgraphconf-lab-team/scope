import { memo, type ReactNode, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import BaseExploreNode from '~/components/explore/BaseExploreNode';
import { useFileDialogStore } from '~/stores/store';
import {
    BaseExploreNodeDropdownActionType,
    BaseExploreNodeDropdownOption,
    BaseExploreNodeHandleOption,
} from '~/types/explore/nodeData/baseNodeData';
import { FileNode } from '~/types/explore/nodes';

interface FileNodeProps extends NodeProps<FileNode> {
    title: string;
    iconName: string;
    handleOptions: BaseExploreNodeHandleOption[];
    dropdownOptions: BaseExploreNodeDropdownOption[];
    customActions?: ReactNode;
}

const BaseFileNode = memo<FileNodeProps>((props) => {
    const { id, data, selected, title, iconName, handleOptions, dropdownOptions, customActions } = props;
    const { assets } = data;
    const { openDialog } = useFileDialogStore();

    const finalHandleOptions = useMemo(() => {
        const options: BaseExploreNodeHandleOption[] = [...handleOptions];

        const isMined = assets.some((asset) => asset.origin === 'mined');

        if (isMined) {
            const hasLeftTarget = options.some((o) => o.position === Position.Left && o.type === 'target');
            if (!hasLeftTarget) {
                options.push({ position: Position.Left, type: 'target' as const });
            }
        }

        return options;
    }, [assets, handleOptions]);

    const handleDropdownAction = (action: BaseExploreNodeDropdownActionType) => {
        switch (action) {
            case 'openFileDialog':
                openDialog(id);
                break;
            case 'changeSourceFile':
                // Handle source file change
                break;
        }
    };

    const renderFileContent = () => {
        const isMined = assets.some((asset) => asset.origin === 'mined');

        if (assets.length === 0) {
            return <p>No file selected</p>;
        }

        if (isMined) {
            return (
                <div>
                    <p>Ready to visualize: {assets.length} input</p>
                    {assets.map((asset, index) => (
                        <div key={index} className="text-sm text-gray-600">
                            Input {index + 1}: {asset.name}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div>
                <p>Selected files: {assets.length}</p>
                {assets.map((asset, index) => (
                    <div key={index} className="text-sm text-gray-600">
                        File name: {asset.name}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <BaseExploreNode
            id={id}
            selected={selected}
            title={title}
            iconName={iconName}
            handleOptions={finalHandleOptions}
            dropdownOptions={dropdownOptions}
            onDropdownAction={handleDropdownAction}
            customActions={customActions}
            customContent={renderFileContent()}
        />
    );
});

export default BaseFileNode;
