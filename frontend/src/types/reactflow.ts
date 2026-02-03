import type { Node, Edge } from '@xyflow/react';
import type { AgentId, Phase } from './agent';

export interface AgentNodeData extends Record<string, unknown> {
  agentId: AgentId;
  agentName: string;
  text: string;
  color: string;
  phase: Phase;
  isStreaming: boolean;
  confidence?: number;
}

export type AgentThoughtNode = Node<AgentNodeData, 'agentThought'>;

export interface DebateEdgeData extends Record<string, unknown> {
  edgeType: 'supports' | 'refutes' | 'depends';
  strength: number;
}

export type DebateEdge = Edge<DebateEdgeData>;

// Conversion helpers
export function toReactFlowNode(node: import('./graph').GraphNode): AgentThoughtNode {
  return {
    id: node.id,
    type: 'agentThought',
    position: { x: node.x, y: node.y },
    data: {
      agentId: node.agentId,
      agentName: node.agentId.charAt(0).toUpperCase() + node.agentId.slice(1),
      text: node.text,
      color: node.color,
      phase: node.phase,
      isStreaming: node.isStreaming,
      confidence: node.confidence,
    },
  };
}

export function toReactFlowEdge(edge: import('./graph').GraphEdge): DebateEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'semantic',
    data: {
      edgeType: edge.type,
      strength: edge.strength,
    },
  };
}
