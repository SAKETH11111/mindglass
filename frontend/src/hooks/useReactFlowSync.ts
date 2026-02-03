import { useCallback, useMemo } from 'react';
import type { Node } from '@xyflow/react';
import { useDebateStore } from './useDebateStore';
import {
    toReactFlowNode,
    toReactFlowEdge,
    type AgentThoughtNode,
    type DebateEdge,
} from '@/types/reactflow';

/**
 * Hook to synchronize Zustand graph state with React Flow format.
 * Zustand remains the single source of truth.
 */
export function useReactFlowSync() {
    // Read from Zustand
    const nodes = useDebateStore((s) => s.nodes);
    const edges = useDebateStore((s) => s.edges);
    const updateNodePosition = useDebateStore((s) => s.updateNodePosition);

    // Convert to React Flow format (memoized)
    const reactFlowNodes = useMemo<AgentThoughtNode[]>(
        () => nodes.map(toReactFlowNode),
        [nodes]
    );

    const reactFlowEdges = useMemo<DebateEdge[]>(
        () => edges.map(toReactFlowEdge),
        [edges]
    );

    // Sync drag position back to Zustand
    const onNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            updateNodePosition(node.id, node.position.x, node.position.y);
        },
        [updateNodePosition]
    );

    return {
        reactFlowNodes,
        reactFlowEdges,
        onNodeDragStop,
    };
}
