import type { AgentId, Phase } from './agent';

export interface StartDebateMessage {
  type: 'start_debate';
  query: string;
}

export interface AgentTokenMessage {
  type: 'agent_token';
  agentId: AgentId;
  content: string;
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
  timestamp: number;
}

export interface AgentDoneMessage {
  type: 'agent_done';
  agentId: AgentId;
  timestamp: number;
}

export interface AgentErrorMessage {
  type: 'agent_error';
  agentId: AgentId;
  error: string;
  timestamp: number;
}

export interface PhaseChangeMessage {
  type: 'phase_change';
  phase: Phase;
  activeAgents: AgentId[];
  timestamp: number;
}

export interface MetricsMessage {
  type: 'metrics';
  tokensPerSecond: number;
  totalTokens: number;
  timestamp: number;
}

export interface DebateCompleteMessage {
  type: 'debate_complete';
  timestamp: number;
}

export interface PhaseStartMessage {
  type: 'phase_start';
  phase: number;
  name: string;
  agents?: string[];
  timestamp?: number;
}

export interface RoundStartMessage {
  type: 'round_start';
  round: number;
  name: string;
  agents?: string[];
  timestamp?: number;
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
