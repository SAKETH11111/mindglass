import { describe, it, expect, beforeEach } from 'vitest';
import { useDebateStore } from './useDebateStore';
import type { GraphNode, GraphEdge } from '@/types/graph';
import type { AgentId, Phase } from '@/types/agent';

describe('useDebateStore Graph State', () => {
  beforeEach(() => {
    useDebateStore.getState().resetDebate();
  });

  describe('Initial State', () => {
    it('should have empty nodes array initially', () => {
      const state = useDebateStore.getState();
      expect(state.nodes).toEqual([]);
    });

    it('should have empty edges array initially', () => {
      const state = useDebateStore.getState();
      expect(state.edges).toEqual([]);
    });

    it('should have null selectedNodeId initially', () => {
      const state = useDebateStore.getState();
      expect(state.selectedNodeId).toBeNull();
    });
  });

  describe('addNode', () => {
    it('should add a node to the nodes array', () => {
      const node: GraphNode = {
        id: 'node-analyst-1',
        agentId: 'analyst' as AgentId,
        text: 'Test text',
        x: 100,
        y: 200,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: true,
      };

      useDebateStore.getState().addNode(node);

      expect(useDebateStore.getState().nodes).toHaveLength(1);
      expect(useDebateStore.getState().nodes[0]).toEqual(node);
    });

    it('should add multiple nodes', () => {
      const node1: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      const node2: GraphNode = {
        id: 'node-2',
        agentId: 'critic' as AgentId,
        text: '',
        x: 100,
        y: 100,
        color: '#EF4444',
        phase: 'conflict' as Phase,
        isStreaming: false,
      };

      useDebateStore.getState().addNode(node1);
      useDebateStore.getState().addNode(node2);

      expect(useDebateStore.getState().nodes).toHaveLength(2);
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      const node: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      useDebateStore.getState().addNode(node);
      useDebateStore.getState().updateNodePosition('node-1', 150, 250);

      const updatedNode = useDebateStore.getState().nodes[0];
      expect(updatedNode.x).toBe(150);
      expect(updatedNode.y).toBe(250);
    });

    it('should not affect other nodes when updating position', () => {
      const node1: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      const node2: GraphNode = {
        id: 'node-2',
        agentId: 'critic' as AgentId,
        text: '',
        x: 100,
        y: 100,
        color: '#EF4444',
        phase: 'conflict' as Phase,
        isStreaming: false,
      };

      useDebateStore.getState().addNode(node1);
      useDebateStore.getState().addNode(node2);
      useDebateStore.getState().updateNodePosition('node-1', 999, 999);

      expect(useDebateStore.getState().nodes[1].x).toBe(100);
      expect(useDebateStore.getState().nodes[1].y).toBe(100);
    });
  });

  describe('updateNodeText', () => {
    it('should update node text', () => {
      const node: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: 'Initial text',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: true,
      };

      useDebateStore.getState().addNode(node);
      useDebateStore.getState().updateNodeText('node-1', 'Updated text');

      expect(useDebateStore.getState().nodes[0].text).toBe('Updated text');
    });
  });

  describe('updateNodeStreaming', () => {
    it('should update node streaming status', () => {
      const node: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: true,
      };

      useDebateStore.getState().addNode(node);
      useDebateStore.getState().updateNodeStreaming('node-1', false);

      expect(useDebateStore.getState().nodes[0].isStreaming).toBe(false);
    });
  });

  describe('removeNode', () => {
    it('should remove a node by id', () => {
      const node: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      useDebateStore.getState().addNode(node);
      useDebateStore.getState().removeNode('node-1');

      expect(useDebateStore.getState().nodes).toHaveLength(0);
    });

    it('should remove connected edges when removing a node', () => {
      const node1: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      const node2: GraphNode = {
        id: 'node-2',
        agentId: 'critic' as AgentId,
        text: '',
        x: 100,
        y: 100,
        color: '#EF4444',
        phase: 'conflict' as Phase,
        isStreaming: false,
      };

      const edge: GraphEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'refutes',
        strength: 0.8,
      };

      useDebateStore.getState().addNode(node1);
      useDebateStore.getState().addNode(node2);
      useDebateStore.getState().addEdge(edge);

      expect(useDebateStore.getState().edges).toHaveLength(1);

      useDebateStore.getState().removeNode('node-1');

      expect(useDebateStore.getState().edges).toHaveLength(0);
    });
  });

  describe('addEdge', () => {
    it('should add an edge to the edges array', () => {
      const edge: GraphEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'supports',
        strength: 0.9,
      };

      useDebateStore.getState().addEdge(edge);

      expect(useDebateStore.getState().edges).toHaveLength(1);
      expect(useDebateStore.getState().edges[0]).toEqual(edge);
    });
  });

  describe('removeEdge', () => {
    it('should remove an edge by id', () => {
      const edge: GraphEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'supports',
        strength: 0.9,
      };

      useDebateStore.getState().addEdge(edge);
      useDebateStore.getState().removeEdge('edge-1');

      expect(useDebateStore.getState().edges).toHaveLength(0);
    });
  });

  describe('setSelectedNode', () => {
    it('should set selected node id', () => {
      useDebateStore.getState().setSelectedNode('node-1');
      expect(useDebateStore.getState().selectedNodeId).toBe('node-1');
    });

    it('should clear selected node when null is passed', () => {
      useDebateStore.getState().setSelectedNode('node-1');
      useDebateStore.getState().setSelectedNode(null);
      expect(useDebateStore.getState().selectedNodeId).toBeNull();
    });
  });

  describe('clearGraph', () => {
    it('should clear all nodes and edges', () => {
      const node: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      const edge: GraphEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'supports',
        strength: 0.9,
      };

      useDebateStore.getState().addNode(node);
      useDebateStore.getState().addEdge(edge);
      useDebateStore.getState().setSelectedNode('node-1');

      useDebateStore.getState().clearGraph();

      expect(useDebateStore.getState().nodes).toHaveLength(0);
      expect(useDebateStore.getState().edges).toHaveLength(0);
      expect(useDebateStore.getState().selectedNodeId).toBeNull();
    });
  });

  describe('startDebate', () => {
    it('should clear graph when starting a new debate', () => {
      const node: GraphNode = {
        id: 'node-1',
        agentId: 'analyst' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: false,
      };

      useDebateStore.getState().addNode(node);
      useDebateStore.getState().setSelectedNode('node-1');

      useDebateStore.getState().startDebate('Test query');

      expect(useDebateStore.getState().nodes).toHaveLength(0);
      expect(useDebateStore.getState().selectedNodeId).toBeNull();
    });
  });
});
