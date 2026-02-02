export const AGENT_COLORS = {
  analyst: '#4ECDC4',
  optimist: '#22C55E',
  pessimist: '#F97316',
  critic: '#EF4444',
  strategist: '#A855F7',
  finance: '#EAB308',
  risk: '#DC2626',
  synthesizer: '#FFFFFF',
} as const;

export type AgentId = keyof typeof AGENT_COLORS;

export const AGENT_NAMES: Record<AgentId, string> = {
  analyst: 'Analyst',
  optimist: 'Optimist',
  pessimist: 'Pessimist',
  critic: 'Critic',
  strategist: 'Strategist',
  finance: 'Finance',
  risk: 'Risk',
  synthesizer: 'Synthesizer',
};
