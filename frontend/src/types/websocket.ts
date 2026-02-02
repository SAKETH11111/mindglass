export interface StartDebateMessage {
  type: 'start_debate';
  query: string;
}

export interface AgentTokenMessage {
  type: 'agent_token';
  agentId: string;
  content: string;
  timestamp: number;
}

export interface AgentDoneMessage {
  type: 'agent_done';
  agentId: string;
  timestamp: number;
}

export interface DebateCompleteMessage {
  type: 'debate_complete';
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WebSocketMessage = AgentTokenMessage | AgentDoneMessage | DebateCompleteMessage | ErrorMessage;
