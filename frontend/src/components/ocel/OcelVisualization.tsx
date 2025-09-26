// import { useCallback, useEffect, useState } from 'react';
// import {
//     Background,
//     Controls,
//     type Edge,
//     MiniMap,
//     type Node,
//     ReactFlow,
//     useEdgesState,
//     useNodesState,
// } from '@xyflow/react';
// import '@xyflow/react/dist/style.css';
// import dagre from 'dagre';
// import { useSearchParams } from 'react-router-dom';
// import { getOcel, saveFilteredOcel } from '~/services/api';
// const nodeWidth = 180;
// const nodeHeight = 60;
// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));
// function getLayoutedElements(nodes: Node[], edges: Edge[]) {
//     dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });
//     nodes.forEach((n) => dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
//     edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));
//     dagre.layout(dagreGraph);
//     return nodes.map((n) => {
//         const pos = dagreGraph.node(n.id);
//         return {
//             ...n,
//             position: {
//                 x: pos.x - nodeWidth / 2,
//                 y: pos.y - nodeHeight / 2,
//             },
//         };
//     });
// }
// const OcelVisualization = () => {
//     const [searchParams] = useSearchParams();
//     const fileId = searchParams.get('fileId');
//     const [loading, setLoading] = useState(true);
//     const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
//     const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
//     const [selectedElements, setSelectedElements] = useState<{ nodes: string[]; edges: string[] }>({
//         nodes: [],
//         edges: [],
//     });
//     useEffect(() => {
//         if (!fileId) return;
//         const fetchData = async () => {
//             setLoading(true);
//             try {
//                 const data = await getOcel(fileId);
//                 const eventNodes: Node[] = data.events.map((evt: any) => ({
//                     id: evt.id,
//                     data: { label: `${evt.type}\n(${evt.time})` },
//                     position: { x: 0, y: 0 },
//                     style: {
//                         background: '#f59e0b',
//                         color: '#fff',
//                         padding: 8,
//                         borderRadius: 5,
//                         fontSize: 12,
//                         textAlign: 'center',
//                     },
//                 }));
//                 const objectIds = new Set<string>();
//                 data.events.forEach((evt: any) => {
//                     evt.relationships.forEach((rel: any) => objectIds.add(rel.objectId));
//                 });
//                 const objectNodes: Node[] = Array.from(objectIds).map((objId) => ({
//                     id: objId,
//                     data: { label: objId },
//                     position: { x: 0, y: 0 },
//                     style: {
//                         background: '#3b82f6',
//                         color: '#fff',
//                         padding: 8,
//                         borderRadius: 5,
//                         fontSize: 12,
//                         textAlign: 'center',
//                     },
//                 }));
//                 const rawEdges: Edge[] = data.events.flatMap((evt: any, idx: number) =>
//                     evt.relationships.map((rel: any) => ({
//                         id: `e-${evt.id}-${rel.objectId}-${idx}`,
//                         source: evt.id,
//                         target: rel.objectId,
//                         label: rel.qualifier,
//                         animated: false,
//                         style: { stroke: '#888' },
//                         labelStyle: { fill: '#555', fontSize: 10 },
//                     }))
//                 );
//                 const layoutedNodes = getLayoutedElements([...eventNodes, ...objectNodes], rawEdges);
//                 setNodes(layoutedNodes);
//                 setEdges(rawEdges);
//             } catch (err) {
//                 console.error('Error fetching OCEL:', err);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchData();
//     }, [fileId, setNodes, setEdges]);
//     const handleDelete = useCallback(() => {
//         if (selectedElements.nodes.length > 0) {
//             setNodes((nds) => nds.filter((n) => !selectedElements.nodes.includes(n.id)));
//             setEdges((eds) =>
//                 eds.filter(
//                     (e) => !selectedElements.nodes.includes(e.source) && !selectedElements.nodes.includes(e.target)
//                 )
//             );
//         }
//         if (selectedElements.edges.length > 0) {
//             setEdges((eds) => eds.filter((e) => !selectedElements.edges.includes(e.id)));
//         }
//         setSelectedElements({ nodes: [], edges: [] });
//     }, [selectedElements, setNodes, setEdges]);
//     const handleSave = async () => {
//         if (!fileId) return;
//         try {
//             const payload = {
//                 fileId,
//                 nodes,
//                 edges,
//             };
//             await saveFilteredOcel(payload);
//             alert('Filtered graph saved successfully');
//         } catch (err) {
//             console.error('Error saving filtered graph:', err);
//             alert('Failed to save filtered graph');
//         }
//     };
//     if (!fileId) return <p>No File selected</p>;
//     if (loading) return <p>Loading graph...</p>;
//     return (
//         <div style={{ width: '100%', height: '90vh' }}>
//             <div className="flex gap-4 mb-2">
//                 {/* <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded">
//                     🗑 Delete Selected
//                 </button>
//                 <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded">
//                     💾 Save Filtered Graph
//                 </button> */}
//             </div>
//             <ReactFlow
//                 nodes={nodes}
//                 edges={edges}
//                 onNodesChange={onNodesChange}
//                 onEdgesChange={onEdgesChange}
//                 onSelectionChange={(sel) =>
//                     setSelectedElements({
//                         nodes: sel.nodes?.map((n) => n.id) || [],
//                         edges: sel.edges?.map((e) => e.id) || [],
//                     })
//                 }
//                 fitView
//                 onlyRenderVisibleElements
//             >
//                 <MiniMap />
//                 <Controls />
//                 <Background />
//             </ReactFlow>
//         </div>
//     );
// };
// export default OcelVisualization;


import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import  {ReactFlow, Background, Controls, MiniMap, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGetOcel } from "~/services/queries";

const MAX_CHUNK = 500; // how many events to load per chunk

const OcelVisualization = () => {
  const [params] = useSearchParams();
  const fileId = params.get("fileId");
  const { data, isLoading, error } = useGetOcel(fileId || "");

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [chunk, setChunk] = useState(1);

  useEffect(() => {
    if (!data) return;
    console.log("Fetched OCEL data:", data);

    const events = data.events || [];
    const objects = data.objects || [];

    // Load only a chunk of events
    const chunkedEvents = events.slice(0, chunk * MAX_CHUNK);

    // Build event nodes
    const eventNodes: Node[] = chunkedEvents.map((evt: any, i: number) => ({
      id: evt.id?.toString(),
      data: { label: evt.type || evt.activity || "Event" },
      position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 100 },
      style: { background: "#f59e0b", color: "#fff", padding: 6, borderRadius: 5, fontSize: 12 },
    }));

    // Collect related objectIds from these events
    const objectIds = new Set<string>();
    chunkedEvents.forEach((evt: any) => {
      (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId));
    });

    // Build object nodes
    const objectNodes: Node[] = Array.from(objectIds).map((objId, i) => ({
      id: objId.toString(),
      data: { label: objects[objId]?.type || objId },
      position: { x: (i % 10) * 200, y: 600 + Math.floor(i / 10) * 100 },
      style: { background: "#3b82f6", color: "#fff", padding: 6, borderRadius: 5, fontSize: 12 },
    }));

    // Build edges
    const newEdges: Edge[] = chunkedEvents.flatMap((evt: any) =>
      (evt.relationships || []).map((rel: any, i: number) => ({
        id: `${evt.id}-${rel.objectId}-${i}`,
        source: evt.id?.toString(),
        target: rel.objectId?.toString(),
        label: rel.qualifier || "",
        style: { stroke: "#999" },
        labelStyle: { fill: "#333", fontSize: 10 },
      }))
    );

    setNodes([...eventNodes, ...objectNodes]);
    setEdges(newEdges);
  }, [data, chunk]);

  if (!fileId) return <p>No File selected</p>;
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading OCEL data</p>;
  if (!data) return <p>No data available</p>;

  const loadMore = () => {
    setChunk((prev) => prev + 1);
  };

  return (
    <div style={{ width: "100%", height: "90vh" }}>
      <h1 className="font-bold text-xl mb-4">OCEL Visualization</h1>
      <ReactFlow nodes={nodes} edges={edges} fitView onlyRenderVisibleElements>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>

      <div className="flex justify-center mt-4">
        {chunk * MAX_CHUNK < data.events.length && (
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default OcelVisualization;




// import { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";
// import  {ReactFlow, Background, Controls, MiniMap, Node, Edge } from "@xyflow/react";
// import "@xyflow/react/dist/style.css";
// import { useGetOcel } from "~/services/queries";

// const MAX_CHUNK = 500; // how many events to load per chunk

// const OcelVisualization = () => {
//   const [params] = useSearchParams();
//   const fileId = params.get("fileId");
//   const { data, isLoading, error } = useGetOcel(fileId || "");

//   const [nodes, setNodes] = useState<Node[]>([]);
//   const [edges, setEdges] = useState<Edge[]>([]);
//   const [chunk, setChunk] = useState(1);

//   // filtering state
//   const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

//   useEffect(() => {
//     if (!data) return;
//     console.log("Fetched OCEL data:", data);

//     const events = data.events || [];
//     const objects = data.objects || [];

//     // filter by type
//     const filteredEvents = events.filter(
//       (evt: any) => selectedTypes.length === 0 || selectedTypes.includes(evt.type)
//     );

//     // load only a chunk of filtered events
//     const chunkedEvents = filteredEvents.slice(0, chunk * MAX_CHUNK);

//     // Build event nodes
//     const eventNodes: Node[] = chunkedEvents.map((evt: any, i: number) => ({
//       id: evt.id?.toString(),
//       data: { label: evt.type || evt.activity || "Event" },
//       position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 100 },
//       style: {
//         background: "#f59e0b",
//         color: "#fff",
//         padding: 6,
//         borderRadius: 5,
//         fontSize: 12,
//       },
//     }));

//     // Collect related objectIds
//     const objectIds = new Set<string>();
//     chunkedEvents.forEach((evt: any) => {
//       (evt.relationships || []).forEach((rel: any) => objectIds.add(rel.objectId));
//     });

//     // Build object nodes
//     const objectNodes: Node[] = Array.from(objectIds).map((objId, i) => ({
//       id: objId.toString(),
//       data: { label: objects[objId]?.type || objId },
//       position: { x: (i % 10) * 200, y: 600 + Math.floor(i / 10) * 100 },
//       style: {
//         background: "#3b82f6",
//         color: "#fff",
//         padding: 6,
//         borderRadius: 5,
//         fontSize: 12,
//       },
//     }));

//     // Build edges
//     const newEdges: Edge[] = chunkedEvents.flatMap((evt: any) =>
//       (evt.relationships || []).map((rel: any, i: number) => ({
//         id: `${evt.id}-${rel.objectId}-${i}`,
//         source: evt.id?.toString(),
//         target: rel.objectId?.toString(),
//         label: rel.qualifier || "",
//         style: { stroke: "#999" },
//         labelStyle: { fill: "#333", fontSize: 10 },
//       }))
//     );

//     setNodes([...eventNodes, ...objectNodes]);
//     setEdges(newEdges);
//   }, [data, chunk, selectedTypes]);

//   if (!fileId) return <p>No File selected</p>;
//   if (isLoading) return <p>Loading...</p>;
//   if (error) return <p>Error loading OCEL data</p>;
//   if (!data) return <p>No data available</p>;

//   const loadMore = () => {
//     setChunk((prev) => prev + 1);
//   };

//   const toggleType = (type: string) => {
//     setChunk(1); // reset pagination when filtering
//     setSelectedTypes((prev) =>
//       prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
//     );
//   };

//   return (
//     <div className="flex h-[90vh]">
//       {/* Sidebar */}
//       <div className="w-64 border-r border-gray-300 p-4 overflow-y-auto">
//         <h2 className="font-bold mb-2">Filter by Event Type</h2>
//         {data.eventTypes?.map((type: any, index: number) => {
//           const typeName = typeof type === "string" ? type : type.name; // ✅ fix for object types
//           return (
//             <div key={index} className="mb-1">
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={selectedTypes.includes(typeName)}
//                   onChange={() => toggleType(typeName)}
//                 />
//                 {typeName}
//               </label>
//             </div>
//           );
//         })}
//       </div>

//       {/* Graph */}
//       <div className="flex-1 relative">
//         <ReactFlow nodes={nodes} edges={edges} fitView onlyRenderVisibleElements>
//           <MiniMap />
//           <Controls />
//           <Background />
//         </ReactFlow>

//         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
//           {chunk * MAX_CHUNK < (data.events?.length || 0) && (
//             <button
//               onClick={loadMore}
//               className="px-4 py-2 bg-blue-500 text-white rounded"
//             >
//               Load More Events ({chunk * MAX_CHUNK}/{data.events.length})
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OcelVisualization;
