import { useParams } from 'react-router-dom';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useGetAbstractionById } from '~/services/queries';

const AbstractionViewer: React.FC = () => {
    const { nodeId } = useParams<{ nodeId: string }>();
    const getNode = useExploreFlowStore((s) => s.getNode);

    const fileNode = nodeId ? getNode(nodeId) : undefined;
    const fileId = fileNode?.data.assets.find((a) => a.io === 'output')?.id ?? null;

    const { data, isLoading, isError } = useGetAbstractionById(fileId);

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
            <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-[70vh] whitespace-pre-wrap break-all">
                {JSON.stringify(data.abstraction, null, 2)}
            </pre>
        );
    };

    return (
        <div className="flex flex-col min-h-screen">
            <BreadcrumbNav />
            <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
                <h1 className="text-2xl font-bold">Abstraction Viewer</h1>
                {data && (
                    <p className="text-sm text-muted-foreground">
                        File ID: <span className="font-mono">{data.file_id}</span>
                    </p>
                )}
                {renderContent()}
            </div>
        </div>
    );
};

export default AbstractionViewer;
