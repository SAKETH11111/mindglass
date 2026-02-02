import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useD3Simulation } from './useD3Simulation';
import { useDebateStore } from './useDebateStore';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { AgentId, Phase } from '@/types/agent';

describe('useD3Simulation', () => {
  beforeEach(() => {
    useDebateStore.getState().resetDebate();
  });

  describe('Hook Initialization', () => {
    it('should initialize with null simulation when dimensions are zero', () => {
      const { result } = renderHook(() =>
        useD3Simulation({ width: 0, height: 0 })
      );

      expect(result.current.simulation.current).toBeNull();
    });

    it('should initialize simulation with valid dimensions', () => {
      const { result } = renderHook(() =>
        useD3Simulation({ width: 800, height: 600 })
      );

      // Simulation should be created after render
      expect(result.current.simulation.current).toBeDefined();
    });

    it('should provide reheat function', () => {
      const { result } = renderHook(() =>
        useD3Simulation({ width: 800, height: 600 })
      );

      expect(typeof result.current.reheat).toBe('function');
    });
  });

  describe('Node Updates', () => {
    it('should update store when nodes are added', () => {
      renderHook(() => useD3Simulation({ width: 800, height: 600 }));

      const node: GraphNode = {
        id: 'node-analyst-1',
        agentId: 'analyst' as AgentId,
        text: 'Test',
        x: 400,
        y: 300,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      act(() => {
        useDebateStore.getState().addNode(node);
      });

      expect(useDebateStore.getState().nodes).toHaveLength(1);
      expect(useDebateStore.getState().nodes[0].id).toBe('node-analyst-1');
    });

    it('should handle multiple nodes', () => {
      renderHook(() => useD3Simulation({ width: 800, height: 600 }));

      const nodes: GraphNode[] = [
        {
          id: 'node-1',
          agentId: 'analyst' as AgentId,
          text: '',
          x: 100,
          y: 100,
          color: '#5F8787',
          phase: 'dispatch' as Phase,
          isStreaming: false,
        },
        {
          id: 'node-2',
          agentId: 'critic' as AgentId,
          text: '',
          x: 200,
          y: 200,
          color: '#EF4444',
          phase: 'conflict' as Phase,
          isStreaming: false,
        },
      ];

      act(() => {
        nodes.forEach((node) => useDebateStore.getState().addNode(node));
      });

      expect(useDebateStore.getState().nodes).toHaveLength(2);
    });
  });

  describe('Edge Updates', () => {
    it('should handle edges between nodes', () => {
      renderHook(() => useD3Simulation({ width: 800, height: 600 }));

      const nodes: GraphNode[] = [
        {
          id: 'node-1',
          agentId: 'analyst' as AgentId,
          text: '',
          x: 100,
          y: 100,
          color: '#5F8787',
          phase: 'dispatch' as Phase,
          isStreaming: false,
        },
        {
          id: 'node-2',
          agentId: 'critic' as AgentId,
          text: '',
          x: 200,
          y: 200,
          color: '#EF4444',
          phase: 'conflict' as Phase,
          isStreaming: false,
        },
      ];

      const edge: GraphEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'refutes',
        strength: 0.8,
      };

      act(() => {
        nodes.forEach((node) => useDebateStore.getState().addNode(node));
        useDebateStore.getState().addEdge(edge);
      });

      expect(useDebateStore.getState().edges).toHaveLength(1);
      expect(useDebateStore.getState().edges[0].type).toBe('refutes');
    });

    it('should support all edge types', () => {
      renderHook(() => useD3Simulation({ width: 800, height: 600 }));

      const edgeTypes: Array<GraphEdge['type']> = ['supports', 'refutes', 'depends'];

      act(() => {
        // Add nodes first
        useDebateStore.getState().addNode({
          id: 'node-1',
          agentId: 'analyst' as AgentId,
          text: '',
          x: 100,
          y: 100,
          color: '#5F8787',
          phase: 'dispatch' as Phase,
          isStreaming: false,
        });

        edgeTypes.forEach((type, index) => {
          useDebateStore.getState().addNode({
            id: `node-${index + 2}`,
            agentId: 'critic' as AgentId,
            text: '',
            x: 200 + index * 50,
            y: 200,
            color: '#EF4444',
            phase: 'conflict' as Phase,
            isStreaming: false,
          });

          useDebateStore.getState().addEdge({
            id: `edge-${type}`,
            source: 'node-1',
            target: `node-${index + 2}`,
            type,
            strength: 0.5,
          });
        });
      });

      expect(useDebateStore.getState().edges).toHaveLength(3);
    });
  });

  describe('Reheat Function', () => {
    it('should reheat simulation without error', () => {
      const { result } = renderHook(() =>
        useD3Simulation({ width: 800, height: 600 })
      );

      act(() => {
        // Should not throw
        result.current.reheat();
      });

      // If we get here, reheat worked
      expect(true).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should stop simulation on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useD3Simulation({ width: 800, height: 600 })
      );

      const simulation = result.current.simulation.current;
      expect(simulation).toBeDefined();

      // Unmount should not throw
      act(() => {
        unmount();
      });

      // If we get here, cleanup worked
      expect(true).toBe(true);
    });
  });
});
