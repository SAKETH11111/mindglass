import type { AgentId, Phase } from './agent';

export type BranchId = 'best' | 'base' | 'worst' | 'meta';

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
  branchId?: BranchId;
  timestamp: number;
}

export interface AgentMetricsMessage {
  type: 'agent_metrics';
  agentId: AgentId;
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  completionTime: number;
  branchId?: BranchId;
  timestamp: number;
}

export interface AgentDoneMessage {
  type: 'agent_done';
  agentId: AgentId;
  branchId?: BranchId;
  timestamp: number;
}

export interface AgentErrorMessage {
  type: 'agent_error';
  agentId: AgentId;
  error: string;
  branchId?: BranchId;
  timestamp: number;
}

export interface PhaseChangeMessage {
  type: 'phase_change';
  phase: Phase;
  activeAgents: AgentId[];
  branchId?: BranchId;
  timestamp: number;
}

export interface MetricsMessage {
  type: 'metrics';
  tokensPerSecond: number;
  totalTokens: number;
  branchId?: BranchId;
  timestamp: number;
}

export interface DebateCompleteMessage {
  type: 'debate_complete';
  timestamp: number;
  branchId?: BranchId;
  totalTokens?: number;
  totalTime?: number;
  avgTokensPerSecond?: number;
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
  branchId?: BranchId;
  timestamp?: number;
}

export interface RoundStartMessage {
  type: 'round_start';
  round: number;
  name: string;
  agents?: string[];
  branchId?: BranchId;
  timestamp?: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  branchId?: BranchId;
}

export interface ConstraintAcknowledgedMessage {
  type: 'constraint_acknowledged';
  constraint: string;
  timestamp: number;
}

export type WebSocketMessage =
  | StartBranchingMessage
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
