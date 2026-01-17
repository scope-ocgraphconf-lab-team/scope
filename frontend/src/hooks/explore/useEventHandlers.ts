import { useConnections } from './useConnections';
import { useDragDrop } from './useDragDrop';
import { useNodeOperations } from './useNodeOperations';

/**
 * This handler handles any user-related pipeline interactions.
 * The sub-handlers such as useNodeOperations() should never be imported on their own.
 * Always import handlers over the useEventHandlers.
 */
export const useEventHandlers = () => {
    const { onNodeDataChange, onNodeDelete, onNodesChange } = useNodeOperations();

    const { handleConnect, isValidConnection, onEdgeDelete } = useConnections();

    const { onDragOver, onDrop } = useDragDrop(onNodeDataChange);

    return {
        onNodeDataChange,
        onNodesChange,
        onEdgeDelete,
        onNodeDelete,
        onDragOver,
        onDrop,
        handleConnect,
        isValidConnection,
    };
};
