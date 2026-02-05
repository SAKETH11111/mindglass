import type { AgentId, Phase } from './agent';

export interface StartDebateMessage {
  type: 'start_debate';
  query: string;
  model?: string;
  previousContext?: string;
  selectedAgents?: AgentId[] | null;
  industry?: string;
  apiKey?: string;
}

export interface StartBranchingMessage {
  type: 'start_branching';
  query: string;
  model?: string;
  previousContext?: string;
  selectedAgents?: AgentId[] | null;
  industry?: string;
  apiKey?: string;
}

export interface AgentTokenMessage {
  type: 'agent_token';
  agentId: AgentId;
  content: string;
  timestamp: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface AgentMetricsMessage {
  type: 'agent_metrics';
  agentId: AgentId;
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  completionTime: number;
  timestamp: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface AgentDoneMessage {
  type: 'agent_done';
  agentId: AgentId;
  timestamp: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface AgentErrorMessage {
  type: 'agent_error';
  agentId: AgentId;
  error: string;
  timestamp: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface PhaseChangeMessage {
  type: 'phase_change';
  phase: Phase;
  activeAgents: AgentId[];
  timestamp: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface MetricsMessage {
  type: 'metrics';
  tokensPerSecond: number;
  totalTokens: number;
  timestamp: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface DebateCompleteMessage {
  type: 'debate_complete';
  timestamp: number;
  totalTokens?: number;
  totalTime?: number;
  avgTokensPerSecond?: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
  benchmark?: {
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
  };
}

export interface PhaseStartMessage {
  type: 'phase_start';
  phase: number;
  name: string;
  agents?: string[];
  timestamp?: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface RoundStartMessage {
  type: 'round_start';
  round: number;
  name: string;
  agents?: string[];
  timestamp?: number;
  branchId?: 'best' | 'base' | 'worst' | 'meta';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface ConstraintAcknowledgedMessage {
  type: 'constraint_acknowledged';
  constraint: string;
  timestamp: number;
}

export type WebSocketMessage =
  | AgentTokenMessage
  | AgentMetricsMessage
  | AgentDoneMessage
  | AgentErrorMessage
  | PhaseChangeMessage
  | PhaseStartMessage
  | RoundStartMessage
  | MetricsMessage
  | DebateCompleteMessage
  | ErrorMessage
  | ConstraintAcknowledgedMessage;
