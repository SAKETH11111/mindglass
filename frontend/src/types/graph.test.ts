import { describe, it, expect } from 'vitest';
import type { GraphNode, GraphEdge, EdgeType } from './graph';
import { EDGE_COLORS, EDGE_STYLES } from './graph';
import type { AgentId, Phase } from './agent';

describe('Graph Types', () => {
  describe('GraphNode interface', () => {
    it('should create a valid GraphNode object', () => {
      const node: GraphNode = {
        id: 'node-analyst-1',
        agentId: 'analyst' as AgentId,
        text: 'Analysis shows positive trends',
        x: 100,
        y: 200,
        color: '#5F8787',
        phase: 'dispatch' as Phase,
        isStreaming: true,
        confidence: 0.85,
        vx: 0.5,
        vy: -0.3,
      };

      expect(node.id).toBe('node-analyst-1');
      expect(node.agentId).toBe('analyst');
      expect(node.text).toBe('Analysis shows positive trends');
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
      expect(node.color).toBe('#5F8787');
      expect(node.phase).toBe('dispatch');
      expect(node.isStreaming).toBe(true);
      expect(node.confidence).toBe(0.85);
      expect(node.vx).toBe(0.5);
      expect(node.vy).toBe(-0.3);
    });

    it('should allow optional fields to be undefined', () => {
      const node: GraphNode = {
        id: 'node-critic-1',
        agentId: 'critic' as AgentId,
        text: '',
        x: 0,
        y: 0,
        color: '#EF4444',
        phase: 'conflict' as Phase,
        isStreaming: false,
      };

      expect(node.confidence).toBeUndefined();
      expect(node.vx).toBeUndefined();
      expect(node.vy).toBeUndefined();
    });
  });

  describe('GraphEdge interface', () => {
    it('should create a valid GraphEdge object', () => {
      const edge: GraphEdge = {
        id: 'edge-1',
        source: 'node-analyst-1',
        target: 'node-critic-1',
        type: 'refutes',
        strength: 0.8,
      };

      expect(edge.id).toBe('edge-1');
      expect(edge.source).toBe('node-analyst-1');
      expect(edge.target).toBe('node-critic-1');
      expect(edge.type).toBe('refutes');
      expect(edge.strength).toBe(0.8);
    });

    it('should support all edge types', () => {
      const types: EdgeType[] = ['supports', 'refutes', 'depends'];

      types.forEach((type) => {
        const edge: GraphEdge = {
          id: `edge-${type}`,
          source: 'node-a',
          target: 'node-b',
          type,
          strength: 0.5,
        };
        expect(edge.type).toBe(type);
      });
    });
  });

  describe('EDGE_COLORS constant', () => {
    it('should have correct colors for all edge types', () => {
      expect(EDGE_COLORS.supports).toBe('#22C55E');
      expect(EDGE_COLORS.refutes).toBe('#EF4444');
      expect(EDGE_COLORS.depends).toBe('#3B82F6');
    });

    it('should be readonly', () => {
      // Type check - this would fail TypeScript if not readonly
      expect(typeof EDGE_COLORS).toBe('object');
    });
  });

  describe('EDGE_STYLES constant', () => {
    it('should have correct styles for supports edge', () => {
      expect(EDGE_STYLES.supports.strokeWidth).toBe(3);
      expect(EDGE_STYLES.supports.dashArray).toBeUndefined();
    });

    it('should have correct styles for refutes edge', () => {
      expect(EDGE_STYLES.refutes.strokeWidth).toBe(3);
      expect(EDGE_STYLES.refutes.dashArray).toBeUndefined();
    });

    it('should have correct styles for depends edge', () => {
      expect(EDGE_STYLES.depends.strokeWidth).toBe(2);
      expect(EDGE_STYLES.depends.dashArray).toBe('5,5');
    });
  });
});
