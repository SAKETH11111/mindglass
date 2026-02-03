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

// Phase names - now mapped to debate rounds
export type Phase = 
  | 'idle' 
  | 'Opening Arguments'    // Round 1: Analyst + Optimist
  | 'Challenge'            // Round 2: Critic + Pessimist attack
  | 'Defense & Rebuttal'   // Round 3: Analyst + Optimist defend
  | 'Expert Analysis'      // Round 4: Strategist + Finance + Risk
  | 'Final Verdict'        // Round 5: Synthesizer
  | 'complete'
  // Legacy phase names for backwards compatibility
  | 'dispatch' | 'conflict' | 'synthesis' | 'convergence';

export interface AgentState {
  id: AgentId;
  name: string;
  text: string;
  color: string;
  phase: Phase | null;
  isActive: boolean;
  isStreaming: boolean;
  tokenCount: number;
  tokensPerSecond: number;
  streamStartTime: number | null;
}
