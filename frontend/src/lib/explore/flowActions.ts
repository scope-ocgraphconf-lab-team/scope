import { Connection } from '@xyflow/react';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { isFileNode } from '~/lib/explore/exploreNodes.utils';
import { BaseExploreNodeAsset } from '~/types/explore/nodeData/baseNodeData';
import { ExploreNodeType } from '~/types/explore/nodeTypesCategories';
import { AssetType } from '~/types/files.types';
import { NodeFactory } from '~/model/explore/node-factory.model';

function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}
export function getDeterministicColor(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return hslToHex(hue, 65, 55);
}
export function generateColorMap(keys: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    keys.forEach((key) => {
        map[key] = getDeterministicColor(key);
    });
    return map;
}
/**
 * Copies a color map to all DOWNSTREAM nodes recursively (following outgoing edges).
 */
export const propagateMapDownstream = (sourceNodeId: string, newMap: Record<string, string>) => {
    const state = useExploreFlowStore.getState();
    const { nodes, edges, updateNodeData } = state;
    console.log(`[Propagation Down] Starting from: ${sourceNodeId}`);
    const visited = new Set<string>();
    const propagate = (currentId: string) => {
        if (visited.has(currentId)) return;
        visited.add(currentId);
        const outgoingEdges = edges.filter((e) => e.source === currentId);
        if (outgoingEdges.length === 0) return;
        outgoingEdges.forEach((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (targetNode) {
                console.log(`[Propagation Down] -> ${targetNode.id}`);
                updateNodeData(targetNode.id, (prev: any) => ({
                    colorMap: { ...(prev.colorMap || {}), ...newMap },
                }));
                propagate(targetNode.id);
            }
        });
    };
    propagate(sourceNodeId);
};
/**
 * Copies a color map to all UPSTREAM nodes recursively (following incoming edges).
 */
export const propagateMapUpstream = (sourceNodeId: string, newMap: Record<string, string>) => {
    const state = useExploreFlowStore.getState();
    const { nodes, edges, updateNodeData } = state;
    console.log(`[Propagation Up] Starting from: ${sourceNodeId}`);
    const visited = new Set<string>();
    const propagate = (currentId: string) => {
        if (visited.has(currentId)) return;
        visited.add(currentId);
        const incomingEdges = edges.filter((e) => e.target === currentId);
        if (incomingEdges.length === 0) return;
        incomingEdges.forEach((edge) => {
            const parentNode = nodes.find((n) => n.id === edge.source);
            if (parentNode) {
                console.log(`[Propagation Up] -> ${parentNode.id}`);
                updateNodeData(parentNode.id, (prev: any) => ({
                    colorMap: { ...(prev.colorMap || {}), ...newMap },
                }));
                propagate(parentNode.id);
            }
        });
    };
    propagate(sourceNodeId);
};
/**
 * Updates a single color on a node and propagates BOTH upstream and downstream.
 * This ensures that changing a color on the filtered OCEL updates the original
 * OCEL, the miner nodes, and everything else in the pipeline.
 */
export const updateNodeColorAndPropagate = (nodeId: string, key: string, color: string) => {
    const { updateNodeData } = useExploreFlowStore.getState();
    updateNodeData(nodeId, (prev: any) => ({
        colorMap: { ...(prev.colorMap || {}), [key]: color },
    }));
    const delta = { [key]: color };
    propagateMapDownstream(nodeId, delta);
    propagateMapUpstream(nodeId, delta);
};
export const handleConnect = (connection: Connection) => {
    const { source, target } = connection;
    const { updateNodeData, onConnect, getNode } = useExploreFlowStore.getState();
    const sourceNode = getNode(source);
    const targetNode = getNode(target);
    onConnect(connection);
    if (sourceNode && targetNode) {
        const propagatedAssets: BaseExploreNodeAsset[] = (sourceNode.data.assets || [])
            .filter((asset) => asset.io === 'output')
            .flatMap((asset) => {
                if (connection.targetHandle === 'conformanceTarget')
                    return [{ ...asset, io: 'input' } as BaseExploreNodeAsset];
                if (isFileNode(targetNode)) return [{ ...asset, io: 'output' } as BaseExploreNodeAsset];
                return [{ ...asset, io: 'input' } as BaseExploreNodeAsset];
            });
        const sourceColorMap = (sourceNode.data as any).colorMap as Record<string, string> | undefined;
        updateNodeData(target, (prev) => {
            const updates: any = {};
            if (propagatedAssets.length > 0) {
                const existingAssets = prev.assets || [];
                const uniqueNewAssets = propagatedAssets.filter(
                    (newAsset) => !existingAssets.some((e) => e.id === newAsset.id && e.io === newAsset.io)
                );
                updates.assets = [...existingAssets, ...uniqueNewAssets];
            }
            if (sourceColorMap) {
                const existingMap = (prev as any).colorMap || {};
                updates.colorMap = { ...existingMap, ...sourceColorMap };
            }
            return updates;
        });
    }
};
export const spawnDownstreamNode = (sourceNodeId: string, nodeType: ExploreNodeType) => {
    const { nodes, addNode } = useExploreFlowStore.getState();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    const newNodePosition = { x: sourceNode.position.x + 400, y: sourceNode.position.y };
    const newNode = NodeFactory.createNode(newNodePosition, nodeType, true);
    addNode(newNode);
    handleConnect({ source: sourceNode.id, target: newNode.id, sourceHandle: 'source', targetHandle: 'target' });
};
export interface HandleMinerOutputParams {
    nodeId: string;
    outputAssetId: string | null | undefined;
    outputAssetType: AssetType;
    outputNodeType: ExploreNodeType;
    inputFileName: string;
}
export const handleMinerOutput = ({
    nodeId,
    outputAssetId,
    outputAssetType,
    outputNodeType,
    inputFileName,
}: HandleMinerOutputParams) => {
    if (!outputAssetId || !inputFileName) return;
    const { updateNodeData, getNode, edges, nodes } = useExploreFlowStore.getState();
    const node = getNode(nodeId);
    if (!node) return;
    const newAsset: BaseExploreNodeAsset = {
        id: outputAssetId,
        io: 'output',
        origin: 'mined',
        type: outputAssetType,
        name: inputFileName,
    };
    updateNodeData(nodeId, (prev) => {
        const currentAssets = prev.assets.filter((a) => a.io !== 'output');
        return { assets: [...currentAssets, newAsset] };
    });
    const existingEdge = edges.find((edge) => edge.source === nodeId);
    if (existingEdge) {
        const targetNode = nodes.find((n) => n.id === existingEdge.target);
        if (targetNode && targetNode.type === outputNodeType) {
            updateNodeData(targetNode.id, (prev: any) => {
                const otherAssets = prev.assets.filter((a: any) => a.io !== 'output');
                const sourceColorMap = (node.data as any).colorMap;
                const existingColorMap = prev.colorMap || {};
                const nextColorMap = sourceColorMap ? { ...existingColorMap, ...sourceColorMap } : existingColorMap;
                return {
                    assets: [...otherAssets, { ...newAsset, io: 'output' }],
                    colorMap: nextColorMap,
                };
            });
            if ((node.data as any).colorMap) {
                propagateMapDownstream(nodeId, (node.data as any).colorMap);
            }
            return;
        }
    }
    spawnDownstreamNode(nodeId, outputNodeType);
};
export const pullUpstreamData = (targetNodeId: string) => {
    const { edges, getNode, updateNodeData } = useExploreFlowStore.getState();
    const targetNode = getNode(targetNodeId);
    if (!targetNode) return;
    const incomingEdges = edges.filter((edge) => edge.target === targetNodeId);
    if (incomingEdges.length === 0) return;
    const newAssets: BaseExploreNodeAsset[] = [];
    let mergedUpstreamColors: Record<string, string> = {};
    incomingEdges.forEach((edge) => {
        const sourceNode = getNode(edge.source);
        if (sourceNode) {
            const propagatedAssets = (sourceNode.data.assets || [])
                .filter((asset) => asset.io === 'output')
                .map((asset) => {
                    if (isFileNode(targetNode)) return { ...asset, io: 'output' } as BaseExploreNodeAsset;
                    return { ...asset, io: 'input' } as BaseExploreNodeAsset;
                });
            newAssets.push(...propagatedAssets);
            const sourceColors = (sourceNode.data as any).colorMap;
            if (sourceColors) mergedUpstreamColors = { ...mergedUpstreamColors, ...sourceColors };
        }
    });
    if (newAssets.length > 0 || Object.keys(mergedUpstreamColors).length > 0) {
        updateNodeData(targetNodeId, (prev: any) => {
            const updates: any = {};
            if (newAssets.length > 0) {
                const otherAssets = (prev.assets || []).filter((a: any) => a.io !== 'input');
                const uniqueNewAssets = newAssets.filter(
                    (newAsset, index, self) =>
                        index === self.findIndex((t) => t.id === newAsset.id && t.io === newAsset.io)
                );
                updates.assets = [...otherAssets, ...uniqueNewAssets];
            }
            if (Object.keys(mergedUpstreamColors).length > 0) {
                updates.colorMap = { ...(prev.colorMap || {}), ...mergedUpstreamColors };
            }
            return updates;
        });
    }
};
