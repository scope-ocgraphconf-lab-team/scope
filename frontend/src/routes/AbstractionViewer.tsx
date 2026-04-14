import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SidebarProvider } from '~/components/ui/sidebar';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import Abstraction from '~/components/abstraction/Abstraction';
import AbstractionSidebar from '~/components/abstraction/AbstractionSidebar';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { getDeterministicColor } from '~/lib/colors';
import { FileExploreNodeData } from '~/types/explore/nodeData/fileNodeData';
import { getObjectTypes } from '~/lib/abstraction/abstractionToFlow';
import { useGetAbstractionById } from '~/services/queries';

const AbstractionViewer: React.FC = () => {
    const { nodeId } = useParams<{ nodeId: string }>();
    const getNode = useExploreFlowStore((s) => s.getNode);

    const colorMap = useExploreFlowStore((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        return (node?.data as FileExploreNodeData)?.colorMap as Record<string, string> | undefined;
    });

    const getObjectColor = useCallback(
        (objectType: string) => colorMap?.[objectType] ?? getDeterministicColor(objectType),
        [colorMap]
    );

    const fileNode = nodeId ? getNode(nodeId) : undefined;
    const fileId = fileNode?.data.assets.find((a) => a.io === 'output')?.id ?? null;

    const { data, isLoading, isError } = useGetAbstractionById(fileId);

    const [filteredObjectTypes, setFilteredObjectTypes] = useState<string[]>([]);

    // Initialise filter to all object types once data arrives
    useEffect(() => {
        if (data?.abstraction) {
            setFilteredObjectTypes(getObjectTypes(data.abstraction));
        }
    }, [data]);

    const objectTypes = data?.abstraction ? getObjectTypes(data.abstraction) : [];

    const renderContent = () => {
        if (!fileId) {
            return (
                <p className="text-muted-foreground text-sm">
                    No abstraction data available. Return to the pipeline and ensure the Abstraction Miner has produced output.
                </p>
            );
        }

        if (isLoading) {
            return <p className="text-muted-foreground text-sm">Loading abstraction...</p>;
        }

        if (isError || !data) {
            return <p className="text-destructive text-sm">Failed to load abstraction data.</p>;
        }

        return (
            <Abstraction
                abstraction={data.abstraction}
                getObjectColor={getObjectColor}
                filteredObjectTypes={filteredObjectTypes}
            />
        );
    };

    return (
        <SidebarProvider>
            <div className="flex flex-col h-screen w-full">
                <BreadcrumbNav />
                <div className="flex flex-1 min-h-0">
                    {renderContent()}
                    <AbstractionSidebar
                        objectTypes={objectTypes}
                        getObjectColor={getObjectColor}
                        filteredObjectTypes={filteredObjectTypes}
                        onFilteredObjectTypesChange={setFilteredObjectTypes}
                    />
                </div>
            </div>
        </SidebarProvider>
    );
};

export default AbstractionViewer;
