import { memo, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import BaseMinerNode from '~/components/explore/miner/BaseMinerNode';
import { useInputAsset, useMinerOutput } from '~/hooks/explore/useMinerAssets';
import { useExtendOcptWithIdentity } from '~/services/queries';
import { MinerNode } from '~/types/explore/nodes';

const ExtendWithIdentityNode = memo<NodeProps<MinerNode>>((node) => {
    const queryClient = useQueryClient();

    const hasMinedAsset = useMemo(() => {
        return node.data.assets.some((asset) => asset.io === 'output');
    }, [node.data.assets]);

    const ocptAsset = useInputAsset(node.data.assets, 'ocptAsset', 'ocptFile');
    const ocelAsset = useInputAsset(node.data.assets, 'ocelAsset', 'ocelFile');
    const inputFileName = ocptAsset?.name ?? ocelAsset?.name ?? '';

    const { isLoading, isFetching, data } = useExtendOcptWithIdentity(
        node.id,
        ocptAsset?.id ?? null,
        ocelAsset?.id ?? null,
        !hasMinedAsset
    );

    useMinerOutput(node.id, data?.file_id, inputFileName, 'identityOcptAsset', 'ocptFileNode');

    const handleReset = useCallback(() => {
        queryClient.removeQueries({ queryKey: ['extendOcptWithIdentity', node.id] });
    }, [queryClient, node.id]);

    return (
        <BaseMinerNode
            {...node}
            title="Extend with Identity"
            iconName="scanEye"
            handleOptions={[
                { id: 'ocptTarget', position: Position.Left, type: 'target' as const },
                { id: 'source', position: Position.Right, type: 'source' as const },
            ]}
            secondaryHandles={[
                { id: 'ocelTarget', label: 'OCEL Input', hintTypes: ['ocelAsset', 'ocelFile'] },
            ]}
            dropdownOptions={[]}
            isLoading={isLoading || isFetching}
            onReset={handleReset}
        />
    );
});

export default ExtendWithIdentityNode;
