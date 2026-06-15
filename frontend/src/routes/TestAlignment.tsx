import React from 'react';
import AlignmentGraph from '~/components/conformance/AlignmentGraph';
import type { GraphConformanceResponse } from '~/services/response.types';

//Fake Data for Testing
const mockData: GraphConformanceResponse = {
    diagnostics_summary: {
        fitness_score: 85.5,
        total_assignment_cost: 4,
        query_case_id: "Test-Case-1"
    },
    optimal_assignment: {
        insertions: [
            { element_type: 'node', label: 'Unplanned Quality Check', reason: 'Inserted Event' },
            { element_type: 'edge', source_node: 'Node A', target_node: 'Unplanned Quality Check', label: 'E2O_Check', reason: 'Inserted Edge' }
        ],
        removals: [
            { element_type: 'node', label: 'Manager Approval', reason: 'Missing Event' },
            { element_type: 'edge', source_node: 'Node B', target_node: 'Manager Approval', label: 'E2O_Approve', reason: 'Missing Edge' }
        ]
    }
};

const TestAlignment: React.FC = () => {
    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}> Test: Alignment Viewer</h1>
                <p>Fitness Score: {mockData.diagnostics_summary.fitness_score}% | Total Cost: {mockData.diagnostics_summary.total_assignment_cost}</p>
            </div>
            <div style={{ flex: 1 }}>
                {}
                <AlignmentGraph conformanceData={mockData} />
            </div>
        </div>
    );
};

export default TestAlignment;