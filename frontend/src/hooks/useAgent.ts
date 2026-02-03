import { useDebateStore } from '@/hooks/useDebateStore';
import type { AgentId, AgentState, Phase } from '@/types/agent';
import { useShallow } from 'zustand/react/shallow';

// Select single agent - only re-renders when this agent changes
export const useAgent = (agentId: AgentId): AgentState => {
  return useDebateStore((state) => state.agents[agentId]);
};

// Select only agent text - minimal re-renders
export const useAgentText = (agentId: AgentId): string => {
  return useDebateStore((state) => state.agents[agentId].text);
};

// Select only agent streaming status
export const useAgentStreaming = (agentId: AgentId): boolean => {
  return useDebateStore((state) => state.agents[agentId].isStreaming);
};

// Select only agent active status
export const useAgentActive = (agentId: AgentId): boolean => {
  return useDebateStore((state) => state.agents[agentId].isActive);
};

// Select all active agents - uses stable selector to prevent infinite loops
export const useActiveAgents = (): AgentState[] => {
  return useDebateStore((state) => {
    const active = Object.values(state.agents).filter((a) => a.isActive);
    // Sort by ID for stable ordering
    return active.sort((a, b) => a.id.localeCompare(b.id));
  });
};

// Select streaming agents - uses stable selector
export const useStreamingAgents = (): AgentState[] => {
  return useDebateStore((state) => {
    const streaming = Object.values(state.agents).filter((a) => a.isStreaming);
    return streaming.sort((a, b) => a.id.localeCompare(b.id));
  });
};

// Select metrics - stable object reference
export const useMetrics = (): { tokensPerSecond: number; totalTokens: number } => {
  return useDebateStore(
    useShallow((state) => ({
      tokensPerSecond: state.tokensPerSecond,
      totalTokens: state.totalTokens,
    }))
  );
};

// Select phase
export const usePhase = (): Phase => {
  return useDebateStore((state) => state.phase);
};

// Select connection state
export const useConnectionState = () => {
  return useDebateStore((state) => state.connectionState);
};

// Select debate status
export const useIsDebating = (): boolean => {
  return useDebateStore((state) => state.isDebating);
};

// Select error
export const useDebateError = (): string | null => {
  return useDebateStore((state) => state.error);
};
