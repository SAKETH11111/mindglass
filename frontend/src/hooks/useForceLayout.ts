import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useDebateStore } from './useDebateStore';

interface SimulationNode extends d3.SimulationNodeDatum {
    id: string;
    x: number;
    y: number;
}

/**
 * Hook to apply D3 force-directed layout to graph nodes.
 * Updates positions in Zustand store when simulation ticks.
 */
export function useForceLayout() {
    const nodes = useDebateStore((s) => s.nodes);
    const updateNodePosition = useDebateStore((s) => s.updateNodePosition);
    const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);

    useEffect(() => {
        if (nodes.length === 0) {
            // Stop simulation if no nodes
            if (simulationRef.current) {
                simulationRef.current.stop();
                simulationRef.current = null;
            }
            return;
        }

        // Convert nodes to simulation format
        const simNodes: SimulationNode[] = nodes.map((n) => ({
            id: n.id,
            x: n.x,
            y: n.y,
        }));

        // Create or update simulation
        if (!simulationRef.current) {
            simulationRef.current = d3
                .forceSimulation<SimulationNode>(simNodes)
                .force('charge', d3.forceManyBody().strength(-300))
                .force('collide', d3.forceCollide().radius(100))
                .force('center', d3.forceCenter(400, 300))
                .force('x', d3.forceX(400).strength(0.05))
                .force('y', d3.forceY(300).strength(0.05))
                .alphaDecay(0.02)
                .on('tick', () => {
                    // Update Zustand positions on each tick
                    simNodes.forEach((simNode) => {
                        if (simNode.x !== undefined && simNode.y !== undefined) {
                            updateNodePosition(simNode.id, simNode.x, simNode.y);
                        }
                    });
                });
        } else {
            // Update simulation nodes
            simulationRef.current.nodes(simNodes);
            simulationRef.current.alpha(0.3).restart();
        }

        return () => {
            // Don't stop on cleanup - let it settle
        };
        // We intentionally only depend on nodes.length, not nodes array
        // to avoid creating/stopping simulation on every node position update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes.length, updateNodePosition]);

    // Reheat simulation when nodes change substantially
    useEffect(() => {
        if (simulationRef.current && nodes.length > 0) {
            const simNodes: SimulationNode[] = nodes.map((n) => ({
                id: n.id,
                x: n.x,
                y: n.y,
            }));
            simulationRef.current.nodes(simNodes);
            simulationRef.current.alpha(0.1).restart();
        }
    }, [nodes]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (simulationRef.current) {
                simulationRef.current.stop();
                simulationRef.current = null;
            }
        };
    }, []);
}

/**
 * Function to reheat simulation after drag
 * Can be exported and called from drag handlers
 */
export function reheatSimulation() {
    // This would need access to the simulation ref
    // For now, the simulation auto-reheats based on position changes
}
