// Base agent IDs that are always available
export type BaseAgentId =
  | 'analyst'
  | 'optimist'
  | 'pessimist'
  | 'critic'
  | 'strategist'
  | 'finance'
  | 'risk'
  | 'synthesizer';

// Industry-specific agent IDs
export type IndustryAgentId =
  // SaaS
  | 'saas_metrics'
  | 'saas_growth'
  // E-commerce
  | 'ecommerce_conversion'
  | 'ecommerce_operations'
  // Fintech
  | 'fintech_compliance'
  | 'fintech_risk'
  // Healthcare
  | 'healthcare_clinical'
  | 'healthcare_regulatory'
  // Manufacturing
  | 'manufacturing_operations'
  | 'manufacturing_quality'
  // Consulting
  | 'consulting_client'
  | 'consulting_delivery';

// All possible agent IDs
export type AgentId = BaseAgentId | IndustryAgentId;

export const AGENT_IDS: BaseAgentId[] = [
  'analyst',
  'optimist',
  'pessimist',
  'critic',
  'strategist',
  'finance',
  'risk',
  'synthesizer',
];

// Base colors (always available)
export const AGENT_COLORS: Record<string, string> = {
  analyst: '#5F8787',
  optimist: '#E78A53',
  pessimist: '#FBCB97',
  critic: '#EF4444',
  strategist: '#A855F7',
  finance: '#EAB308',
  risk: '#B91C1C',
  synthesizer: '#C1C1C1',
  // SaaS
  saas_metrics: '#3B82F6',
  saas_growth: '#10B981',
  // E-commerce
  ecommerce_conversion: '#F59E0B',
  ecommerce_operations: '#8B5CF6',
  // Fintech
  fintech_compliance: '#EF4444',
  fintech_risk: '#F97316',
  // Healthcare
  healthcare_clinical: '#06B6D4',
  healthcare_regulatory: '#EC4899',
  // Manufacturing
  manufacturing_operations: '#6366F1',
  manufacturing_quality: '#14B8A6',
  // Consulting
  consulting_client: '#A855F7',
  consulting_delivery: '#22C55E',
} as const;

export const AGENT_NAMES: Record<string, string> = {
  analyst: 'Analyst',
  optimist: 'Optimist',
  pessimist: 'Pessimist',
  critic: 'Critic',
  strategist: 'Strategist',
  finance: 'Finance',
  risk: 'Risk',
  synthesizer: 'Synthesizer',
  // SaaS
  saas_metrics: 'SaaS Metrics',
  saas_growth: 'Growth Strategy',
  // E-commerce
  ecommerce_conversion: 'Conversion Expert',
  ecommerce_operations: 'E-commerce Ops',
  // Fintech
  fintech_compliance: 'Fintech Compliance',
  fintech_risk: 'Fintech Risk',
  // Healthcare
  healthcare_clinical: 'Clinical Expert',
  healthcare_regulatory: 'Healthcare Regulatory',
  // Manufacturing
  manufacturing_operations: 'Manufacturing Ops',
  manufacturing_quality: 'Quality & Compliance',
  // Consulting
  consulting_client: 'Client Strategy',
  consulting_delivery: 'Delivery Expert',
} as const;

// Map industries to their specialized agents (replace finance and risk)
export const INDUSTRY_AGENTS: Record<string, [IndustryAgentId, IndustryAgentId]> = {
  saas: ['saas_metrics', 'saas_growth'],
  ecommerce: ['ecommerce_conversion', 'ecommerce_operations'],
  fintech: ['fintech_compliance', 'fintech_risk'],
  healthcare: ['healthcare_clinical', 'healthcare_regulatory'],
  manufacturing: ['manufacturing_operations', 'manufacturing_quality'],
  consulting: ['consulting_client', 'consulting_delivery'],
};

// Get agent IDs for a given industry
export function getAgentIdsForIndustry(industry?: string): AgentId[] {
  const base: AgentId[] = ['analyst', 'optimist', 'pessimist', 'critic', 'strategist'];
  
  if (industry && industry !== 'any' && INDUSTRY_AGENTS[industry]) {
    return [...base, ...INDUSTRY_AGENTS[industry], 'synthesizer'];
  }
  
  return [...base, 'finance', 'risk', 'synthesizer'];
}

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
  id: AgentId | string;  // Allow dynamic industry agent IDs
  name: string;
  text: string;
  color: string;
  phase: Phase | null;
  isActive: boolean;
  isStreaming: boolean;
  tokenCount: number;
  tokensPerSecond: number;
  streamStartTime: number | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  completionTime: number;
}
