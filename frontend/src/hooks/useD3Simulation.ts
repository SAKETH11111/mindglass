import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/types/graph';
import { useDebateStore } from '@/hooks/useDebateStore';

interface SimulationConfig {
  width: number;
  height: number;
}

interface D3SimulationReturn {
  simulation: React.MutableRefObject<d3.Simulation<GraphNode, GraphEdge> | null>;
  reheat: () => void;
}

export function useD3Simulation({ width, height }: SimulationConfig): D3SimulationReturn {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  // Get store state
  const nodes = useDebateStore((state) => state.nodes);
  const edges = useDebateStore((state) => state.edges);
  const updateNodePosition = useDebateStore((state) => state.updateNodePosition);

  // Keep refs in sync with store
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Initialize simulation
  useEffect(() => {
    if (width === 0 || height === 0) return;

    const simulation = d3
      .forceSimulation<GraphNode>(nodesRef.current)
      .force(
        'charge',
        d3.forceManyBody().strength(-300)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius(60)
      )
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(edgesRef.current)
          .id((d) => d.id)
          .distance(150)
          .strength((link) => {
            // Green edges pull together, red push apart
            if (link.type === 'supports') return 0.8;
            if (link.type === 'refutes') return 0.1;
            return 0.5;
          })
      )
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    // Update positions on tick
    simulation.on('tick', () => {
      nodesRef.current.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined) {
          updateNodePosition(node.id, node.x, node.y);
        }
      });
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [width, height, updateNodePosition]);

  // Update simulation when nodes/edges change
  useEffect(() => {
    if (!simulationRef.current) return;

    simulationRef.current.nodes(nodes);
    simulationRef.current.force<d3.ForceLink<GraphNode, GraphEdge>>('link')?.links(edges);
    simulationRef.current.alpha(0.3).restart();
  }, [nodes, edges]);

  // Method to manually reheat simulation
  const reheat = useCallback(() => {
    simulationRef.current?.alpha(0.5).restart();
  }, []);

  return { simulation: simulationRef, reheat };
}
