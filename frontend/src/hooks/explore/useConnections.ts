import { type MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { type Connection, type Edge, type IsValidConnection } from '@xyflow/react';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { validateConnection } from '~/lib/explore/connectionGuards';

export const useConnections = () => {
    const { nodes, onConnect, removeEdge } = useExploreFlowStore();

    const onEdgeDelete = useCallback(
        (event: ReactMouseEvent, edge: Edge) => {
            event.stopPropagation();
            removeEdge(edge.id);
        },
        [removeEdge]
    );

    /**
     * The hook that is used by ReactFlow to check if a connection is valid.
     */
    const isValidConnection: IsValidConnection = useCallback(
        (connection: Edge | Connection) => {
            return validateConnection(connection, nodes);
        },
        [nodes]
    );

    /**
     * Handles the conneciton of two nodes.
     * The validity will be checked automatically by ReactFlow.
     */
    const handleConnect = useCallback(
        (connection: Connection) => {
            onConnect(connection);
        },
        [onConnect]
    );

    return {
        onEdgeDelete,
        isValidConnection,
        handleConnect,
    };
};
