import { useCallback } from 'react';
import { type Connection, type NodeChange } from '@xyflow/react';
import { isEqual } from 'lodash-es';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { assetTypeToNodeType, isMinerNode } from '~/lib/explore/exploreNodes.utils';
import { Logger } from '~/lib/logger';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { ExploreNodeData } from '~/types/explore/nodes';
import { NodeFactory } from '~/model/explore/node-factory.model';

const logger = Logger.getInstance();

export const useNodeOperations = () => {
    const {
        edges,
        onNodesChange: storeOnNodesChange,
        updateNodeData,
        addNode,
        removeNode,
        getNode,
        onConnect,
    } = useExploreFlowStore();

    /**
     * Handles node deletion
     */
    const onNodeDelete = useCallback(
        (nodeId: string) => {
            removeNode(nodeId);
        },
        [removeNode]
    );

    const onNodeDataChange = useCallback(
        (id: string, newData: Partial<ExploreNodeData>) => {
            try {
                const node = getNode(id);
                if (!node) throw new Error(`Could not find node for id: ${id}`);

                const currentAssets: BaseExploreNodeAsset[] = node.data.assets;

                // Only proceed if assets actually changed
                if (!isEqual(currentAssets, newData.assets)) {
                    logger.debug(`Assets have changed for node ${id}`, currentAssets, newData.assets);

                    // Update the original node
                    updateNodeData(id, newData);

                    if (isMinerNode(node)) {
                        // Handle removed assets
                        const removedAssets = currentAssets.filter(
                            (oldAsset) => !newData.assets?.some((newAsset) => isEqual(newAsset, oldAsset))
                        );

                        removedAssets.forEach((removedAsset) => {
                            if (removedAsset.io === 'output') {
                                // Find neighbors that were created from this asset using Edges
                                const outgoingEdges = edges.filter((e) => e.source === id);

                                const neighborsToDelete = outgoingEdges
                                    .map((e) => getNode(e.target))
                                    .filter((neighbor) => {
                                        return neighbor?.data.assets.some(
                                            (asset: BaseExploreNodeAsset) =>
                                                asset.id === removedAsset.id && asset.io === 'input' // Note: It became input in the neighbor
                                        );
                                    });

                                // Delete identified neighbors
                                neighborsToDelete.forEach((neighbor) => {
                                    if (neighbor) onNodeDelete(neighbor.id);
                                });
                            }
                        });

                        // Handle new assets
                        const newAssets =
                            newData.assets?.filter(
                                (newAsset) => !currentAssets.some((oldAsset) => isEqual(newAsset, oldAsset))
                            ) ?? [];

                        const newOutputAssets = newAssets.filter((asset) => asset.io === 'output');

                        newOutputAssets.forEach((asset, index) => {
                            const nodeType = assetTypeToNodeType(asset.type);

                            if (nodeType) {
                                const newNodePosition = {
                                    x: node.position.x + 400,
                                    y: node.position.y + index * 150,
                                };

                                const newNode = NodeFactory.createNode(newNodePosition, nodeType);
                                newNode.data.onDataChange = onNodeDataChange;
                                newNode.data.assets = [{ ...asset, io: 'output' }];

                                addNode(newNode);

                                // Connect the original node to the new one
                                const connection: Connection = {
                                    source: id,
                                    target: newNode.id,
                                    sourceHandle: null,
                                    targetHandle: null,
                                };
                                onConnect(connection);
                            }
                        });
                    }
                } else {
                    // Assets have not changed — just update the node data
                    updateNodeData(id, newData);
                }
            } catch (err) {
                logger.error(err);
            }
        },
        [getNode, updateNodeData, addNode, onConnect, edges, onNodeDelete]
    );

    /**
     * Intercepts all node changes from React Flow. Node changes can include
     * - Position changes
     * - Node Deletion, Creation, Changing
     * - See the NodeChange type in the params for more
     */
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const removeChanges = changes.filter((change) => change.type === 'remove');
            removeChanges.forEach((change) => {
                if (change.type === 'remove') {
                    onNodeDelete(change.id);
                }
            });

            // Other changes include for example position changes.
            // Thus we also update the nodes in the store with this information such that the pipeline state is persistent.
            const otherChanges = changes.filter((change) => change.type !== 'remove');
            if (otherChanges.length > 0) {
                storeOnNodesChange(otherChanges);
            }
        },
        [onNodeDelete, storeOnNodesChange]
    );

    return {
        onNodeDataChange,
        onNodeDelete,
        onNodesChange,
    };
};
