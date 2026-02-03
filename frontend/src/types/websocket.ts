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

export interface DebateTimeoutMessage {
  type: 'debate_timeout';
  message: string;
  timestamp: number;
}

export interface PhaseStartMessage {
  type: 'phase_start';
  phase: number;
  name: string;
  timestamp?: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WebSocketMessage =
  | AgentTokenMessage
  | AgentDoneMessage
  | AgentErrorMessage
  | PhaseChangeMessage
  | PhaseStartMessage
  | MetricsMessage
  | DebateCompleteMessage
  | DebateTimeoutMessage
  | ErrorMessage;
