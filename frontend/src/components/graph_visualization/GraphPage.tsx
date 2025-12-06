

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGetLogGraphs } from '~/services/queries';

interface CaseGraphData {
    deselected_object_types?: string[];
    deselected_event_types?: string[];
    deselected_arcs?: { source_type: string; target_type: string }[];
}

interface GraphPageProps {
    fileId: string;
    caseNotionGraph?: CaseGraphData | null;
    editable?: boolean; 
}

const GraphPage: React.FC<GraphPageProps> = ({ fileId, caseNotionGraph, editable = false }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    const { data, isLoading, error } = useGetLogGraphs(fileId);

    
    const [localGraph, setLocalGraph] = useState<any | null>(null);

   
    React.useEffect(() => {
        if (!data) return;

        const nodes: any[] = [];
        const links: any[] = [];

        data.event_types.forEach((et: string) => {
            nodes.push({
                id: et,
                group: 'event',
                deselected: caseNotionGraph?.deselected_event_types?.includes(et) ?? false,
                originalGroup: 'event',
            });
        });

        data.object_types.forEach((ot: string) => {
            nodes.push({
                id: ot,
                group: 'object',
                deselected: caseNotionGraph?.deselected_object_types?.includes(ot) ?? false,
                originalGroup: 'object',
            });
        });

        data.arcs.forEach((a: any) => {
            const isDeselected =
                caseNotionGraph?.deselected_arcs?.some(
                    (da) => da.source_type === a.source_type && da.target_type === a.target_type
                ) ?? false;

            links.push({
                source: a.source_type,
                target: a.target_type,
                deselected: isDeselected,
            });
        });

        setLocalGraph({ nodes, links });
    }, [data, caseNotionGraph]);

    
    useEffect(() => {
        if (!localGraph || !svgRef.current || !containerRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const g = svg.attr('viewBox', `0 0 ${width} ${height}`).append('g');

       
        svg.call(
            d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
                g.attr('transform', event.transform);
            })
        );

        
        const simulation = d3
            .forceSimulation(localGraph.nodes as any)
            .force(
                'link',
                d3
                    .forceLink(localGraph.links as any)
                    .id((d: any) => d.id)
                    .distance(160)
            )
            .force('charge', d3.forceManyBody().strength(-350))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(45));

      
        const link = g
            .append('g')
            .selectAll('line')
            .data(localGraph.links)
            .enter()
            .append('line')
            .attr('stroke-width', 3)
            .attr('stroke', (d: any) => (d.deselected ? '#C0C0C0' : 'black'))
            .attr('stroke-opacity', (d: any) => (d.deselected ? 0.35 : 0.85))
            .on('click', function (_, d: any) {
                if (!editable) return;

                d.deselected = !d.deselected;
                d3.select(this)
                    .attr('stroke', d.deselected ? '#C0C0C0' : 'black')
                    .attr('stroke-opacity', d.deselected ? 0.35 : 0.85);
            });

        const nodeColor = (d: any) => {
            if (d.deselected) return '#C0C0C0';
            return d.group === 'event' ? '#007BFF' : '#FF5F15';
        };

       
        const node = g
            .append('g')
            .selectAll('circle')
            .data(localGraph.nodes)
            .enter()
            .append('circle')
            .attr('r', 18)
            .attr('fill', nodeColor)
            .attr('stroke', '#222')
            .attr('stroke-width', 1.5)
            .on('click', function (_, d: any) {
                if (!editable) return;

                d.deselected = !d.deselected;

                d3.select(this)
                    .attr('fill', nodeColor(d))
                    .attr('stroke-opacity', d.deselected ? 0.35 : 1);
            })
            .call(
                d3
                    .drag<SVGCircleElement, any>()
                    .on('start', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on('end', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
            );

       
        const label = g
            .append('g')
            .selectAll('text')
            .data(localGraph.nodes)
            .enter()
            .append('text')
            .text((d: any) => d.id)
            .attr('font-size', 11)
            .attr('text-anchor', 'middle')
            .attr('dy', -22);

        
        simulation.on('tick', () => {
            link.attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
            label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
        });
    }, [localGraph, editable]);

    if (isLoading) return <div className="flex w-full h-full justify-center items-center">Loading...</div>;
    if (error) return <div className="flex w-full h-full justify-center items-center text-red-500">Failed to load graph</div>;

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
};

export default GraphPage;
