export type AgentId =
  | 'analyst'
  | 'optimist'
  | 'pessimist'
  | 'critic'
  | 'strategist'
  | 'finance'
  | 'risk'
  | 'synthesizer';

export const AGENT_IDS: AgentId[] = [
  'analyst',
  'optimist',
  'pessimist',
  'critic',
  'strategist',
  'finance',
  'risk',
  'synthesizer',
];

export const AGENT_COLORS: Record<AgentId, string> = {
  analyst: '#5F8787',
  optimist: '#E78A53',
  pessimist: '#FBCB97',
  critic: '#EF4444',
  strategist: '#A855F7',
  finance: '#EAB308',
  risk: '#B91C1C',
  synthesizer: '#C1C1C1',
} as const;

export const AGENT_NAMES: Record<AgentId, string> = {
  analyst: 'Analyst',
  optimist: 'Optimist',
  pessimist: 'Pessimist',
  critic: 'Critic',
  strategist: 'Strategist',
  finance: 'Finance',
  risk: 'Risk',
  synthesizer: 'Synthesizer',
} as const;

export type Phase = 'idle' | 'dispatch' | 'conflict' | 'synthesis' | 'convergence' | 'complete';

export interface AgentState {
  id: AgentId;
  name: string;
  text: string;
  color: string;
  phase: Phase | null;
  isActive: boolean;
  isStreaming: boolean;
  tokenCount: number;
}
