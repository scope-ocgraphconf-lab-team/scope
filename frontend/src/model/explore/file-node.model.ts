import { type XYPosition } from '@xyflow/react';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import { FileNode } from '~/types/explore/nodes';
import { ExploreFileNodeType } from '~/types/explore/nodeTypesCategories';
import { AssetType } from '~/types/files.types';
import { BaseExploreNode } from './base-node.model';

export class FileExploreNode extends BaseExploreNode<FileExploreNodeData> implements FileNode {
    declare type: ExploreFileNodeType;
    // Explicitly declare the narrower type for data to satisfy FileNode interface
    declare data: FileExploreNodeData & { nodeType: ExploreFileNodeType; nodeCategory: 'file' };

    constructor(position: XYPosition, nodeType: ExploreFileNodeType) {
        super(position, nodeType);
    }

    protected initializeData(
        nodeType: ExploreFileNodeType
    ): FileExploreNodeData & { nodeType: ExploreFileNodeType; nodeCategory: 'file' } {
        return {
            nodeType,
            nodeCategory: 'file',
            assets: [],
            allowedAssetTypes: this.getAllowedAssetTypes(nodeType),
        };
    }

    private getAllowedAssetTypes(nodeType: ExploreFileNodeType): readonly AssetType[] {
        switch (nodeType) {
            case 'ocelFileNode':
                return ['ocelFile'] as const;
            case 'ocptFileNode':
                return ['ocptFile'] as const;
            case 'ocelCollectionNode': // Handle potential missing case if it exists in the type
                return ['ocelCollectionFile'] as const;
        }
    }
}
