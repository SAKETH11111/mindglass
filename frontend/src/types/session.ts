import type { AgentId } from './agent';

/**
 * Represents a single debate turn (question + agent responses)
 */
export interface DebateTurn {
  id: string;
  query: string;
  timestamp: number;
  agentResponses: Record<AgentId, string>;
  selectedAgents: AgentId[];
  isComplete: boolean;
  benchmarkReport?: {
    e2eMs: number;
    firstTokenMs: number | null;
    rounds: Record<string, { name: string; agents: string[]; durationMs: number }>;
    agents: Record<
      string,
      {
        round: number;
        model: string;
        ttftMs: number | null;
        avgItlMs: number | null;
        p50ItlMs: number | null;
        p95ItlMs: number | null;
        chunks: number;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        completionTimeSec?: number;
        tokensPerSecond?: number;
      }
    >;
  } | null;
  checkpoints?: Array<{
    id: string;
    timestamp: number;
    type: 'agent_done' | 'round_start' | 'constraint';
    label: string;
    agentId?: string;
    roundName?: string;
    agentTexts: Record<string, string>;
  }>;
  elapsedMs?: number;
  tokensPerSecond?: number;
  totalTokens?: number;
}

/**
 * Represents a complete consultation session that can span multiple turns
 */
export interface ConsultationSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: DebateTurn[];
  selectedAgents: AgentId[];
  modelTier: 'fast' | 'pro';
}

/**
 * Session storage format for localStorage
 */
export interface SessionStorageData {
  sessions: ConsultationSession[];
  currentSessionId: string | null;
}

// Default agents to include in a consultation
export const DEFAULT_SELECTED_AGENTS: AgentId[] = [
  'analyst',
  'optimist',
  'pessimist',
  'critic',
  'strategist',
  'finance',
  'risk',
  'synthesizer',
];

// Helper to create a new session
export function createNewSession(initialQuery?: string, selectedAgents?: AgentId[], modelTier: 'fast' | 'pro' = 'pro'): ConsultationSession {
  const now = Date.now();
  const session: ConsultationSession = {
    id: `session-${now}-${Math.random().toString(36).substring(2, 9)}`,
    title: initialQuery ? (initialQuery.length > 50 ? initialQuery.substring(0, 50) + '...' : initialQuery) : 'New Consultation',
    createdAt: now,
    updatedAt: now,
    turns: [],
    selectedAgents: selectedAgents || DEFAULT_SELECTED_AGENTS,
    modelTier,
  };
  return session;
}

// Helper to create a new turn
export function createNewTurn(query: string, selectedAgents: AgentId[]): DebateTurn {
  const agentResponses: Record<AgentId, string> = {} as Record<AgentId, string>;
  selectedAgents.forEach(id => {
    agentResponses[id] = '';
  });
  
  return {
    id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    query,
    timestamp: Date.now(),
    agentResponses,
    selectedAgents,
    isComplete: false,
  };
}
