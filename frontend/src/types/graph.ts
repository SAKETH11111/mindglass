import type { AgentId, Phase } from './agent';

export interface GraphNode {
  id: string; // Unique node ID (e.g., "node-analyst-1")
  agentId: AgentId; // Which agent
  text: string; // Current accumulated text (from agent state)
  confidence?: number; // 0-1 confidence score
  x: number; // D3 position
  y: number;
  vx?: number; // D3 velocity
  vy?: number;
  color: string; // From AGENT_COLORS
  phase: Phase; // When created
  isStreaming: boolean; // Currently streaming
}

export type EdgeType = 'supports' | 'refutes' | 'depends' | 'constraint';

export interface GraphEdge {
  id: string; // Unique edge ID
  source: string; // Source node ID
  target: string; // Target node ID
  type: EdgeType;
  strength: number; // 0-1 for D3 force
}

export const EDGE_COLORS: Record<EdgeType, string> = {
  supports: '#22C55E', // Green
  refutes: '#EF4444', // Red  
  depends: '#3B82F6', // Blue
  constraint: '#888888', // Gray for user constraints
} as const;

export const EDGE_STYLES: Record<EdgeType, { strokeWidth: number; dashArray?: string }> = {
  supports: { strokeWidth: 2 },
  refutes: { strokeWidth: 2 },
  depends: { strokeWidth: 1.5, dashArray: '5,5' },
  constraint: { strokeWidth: 2, dashArray: '3,3' },
} as const;
