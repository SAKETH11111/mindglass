import { create } from 'zustand';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface DebateState {
  connectionState: ConnectionState;
  agentText: string;
  isStreaming: boolean;
  error: string | null;
  currentAgentId: string | null;

  setConnectionState: (state: ConnectionState) => void;
  appendToken: (agentId: string, content: string) => void;
  clearResponse: () => void;
  setError: (error: string | null) => void;
  startStreaming: (agentId: string) => void;
  stopStreaming: () => void;
}

export const useDebateStore = create<DebateState>((set) => ({
  connectionState: 'connecting',
  agentText: '',
  isStreaming: false,
  error: null,
  currentAgentId: null,

  setConnectionState: (state) => set({ connectionState: state }),

  appendToken: (agentId, content) => set((s) => ({
    agentText: s.agentText + content,
    currentAgentId: agentId,
  })),

  clearResponse: () => set({
    agentText: '',
    isStreaming: false,
    currentAgentId: null,
    error: null,
  }),

  setError: (error) => set((s) => ({
    error,
    connectionState: error ? 'error' : s.connectionState,
    isStreaming: false,
  })),

  startStreaming: (agentId) => set({
    isStreaming: true,
    currentAgentId: agentId,
    agentText: '',
  }),

  stopStreaming: () => set({
    isStreaming: false,
  }),
}));
