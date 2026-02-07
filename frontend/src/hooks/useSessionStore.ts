import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AgentId } from '@/types/agent';
import { AGENT_IDS } from '@/types/agent';
import type { ConsultationSession, DebateTurn } from '@/types/session';
import { createNewSession, createNewTurn, DEFAULT_SELECTED_AGENTS } from '@/types/session';
import { saveSession, loadSessions, getSession, deleteSession } from '@/lib/sessionStorage';

interface SessionState {
  // Current session
  currentSession: ConsultationSession | null;
  currentTurnIndex: number;
  
  // Agent selection
  selectedAgents: AgentId[];
  
  // Session history
  sessionHistory: ConsultationSession[];
  
  // UI state
  isHistoryPanelOpen: boolean;
  isAgentSelectorOpen: boolean;
  
  // Actions
  createSession: (initialQuery?: string, selectedAgents?: AgentId[], modelTier?: 'fast' | 'pro') => ConsultationSession;
  loadSession: (sessionId: string) => ConsultationSession | null;
  loadAllSessions: () => void;
  deleteSessionById: (sessionId: string) => void;
  
  // Turn management
  startNewTurn: (query: string) => DebateTurn;
  completeTurn: () => void;
  updateTurnResponse: (agentId: AgentId, text: string) => void;
  updateTurnMetadata: (
    metadata: Partial<Pick<DebateTurn, 'benchmarkReport' | 'checkpoints' | 'elapsedMs' | 'tokensPerSecond' | 'totalTokens'>>
  ) => void;
  
  // Agent selection
  setSelectedAgents: (agents: AgentId[]) => void;
  toggleAgent: (agentId: AgentId) => void;
  selectAllAgents: () => void;
  deselectAllAgents: () => void;
  
  // Build context from previous turns
  getPreviousTurnsContext: () => string;
  
  // UI actions
  setHistoryPanelOpen: (open: boolean) => void;
  setAgentSelectorOpen: (open: boolean) => void;
  
  // Persistence
  saveCurrentSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    currentSession: null,
    currentTurnIndex: -1,
    selectedAgents: DEFAULT_SELECTED_AGENTS,
    sessionHistory: [],
    isHistoryPanelOpen: false,
    isAgentSelectorOpen: false,

    createSession: (initialQuery, selectedAgents, modelTier = 'pro') => {
      const agents = selectedAgents || get().selectedAgents;
      const session = createNewSession(initialQuery, agents, modelTier);
      set({ 
        currentSession: session,
        currentTurnIndex: -1,
        selectedAgents: agents,
      });
      saveSession(session);
      get().loadAllSessions();
      return session;
    },

    loadSession: (sessionId) => {
      const session = getSession(sessionId);
      if (session) {
        set({ 
          currentSession: session,
          currentTurnIndex: session.turns.length - 1,
          selectedAgents: session.selectedAgents,
        });
      }
      return session;
    },

    loadAllSessions: () => {
      const data = loadSessions();
      set({ sessionHistory: data.sessions });
    },

    deleteSessionById: (sessionId) => {
      deleteSession(sessionId);
      const state = get();
      if (state.currentSession?.id === sessionId) {
        set({ currentSession: null, currentTurnIndex: -1 });
      }
      get().loadAllSessions();
    },

    startNewTurn: (query) => {
      const state = get();
      const session = state.currentSession;
      const selectedAgents = state.selectedAgents;
      
      if (!session) {
        // Create a new session if none exists
        const newSession = get().createSession(query, selectedAgents);
        const turn = createNewTurn(query, selectedAgents);
        newSession.turns.push(turn);
        newSession.updatedAt = Date.now();
        set({ 
          currentSession: newSession,
          currentTurnIndex: 0,
        });
        saveSession(newSession);
        return turn;
      }
      
      const turn = createNewTurn(query, selectedAgents);
      const updatedSession = {
        ...session,
        turns: [...session.turns, turn],
        updatedAt: Date.now(),
      };
      
      set({ 
        currentSession: updatedSession,
        currentTurnIndex: updatedSession.turns.length - 1,
      });
      
      saveSession(updatedSession);
      return turn;
    },

    completeTurn: () => {
      const state = get();
      const session = state.currentSession;
      const turnIndex = state.currentTurnIndex;
      
      if (!session || turnIndex < 0) return;
      
      const updatedTurns = [...session.turns];
      updatedTurns[turnIndex] = {
        ...updatedTurns[turnIndex],
        isComplete: true,
      };
      
      const updatedSession = {
        ...session,
        turns: updatedTurns,
        updatedAt: Date.now(),
      };
      
      set({ currentSession: updatedSession });
      saveSession(updatedSession);
    },

    updateTurnResponse: (agentId, text) => {
      const state = get();
      const session = state.currentSession;
      const turnIndex = state.currentTurnIndex;
      
      if (!session || turnIndex < 0) return;
      
      const updatedTurns = [...session.turns];
      updatedTurns[turnIndex] = {
        ...updatedTurns[turnIndex],
        agentResponses: {
          ...updatedTurns[turnIndex].agentResponses,
          [agentId]: text,
        },
      };
      
      const updatedSession = {
        ...session,
        turns: updatedTurns,
        updatedAt: Date.now(),
      };
      
      set({ currentSession: updatedSession });
      // Don't save on every token - too expensive. Save on completeTurn.
    },

    updateTurnMetadata: (metadata) => {
      const state = get();
      const session = state.currentSession;
      const turnIndex = state.currentTurnIndex;

      if (!session || turnIndex < 0) return;

      const updatedTurns = [...session.turns];
      updatedTurns[turnIndex] = {
        ...updatedTurns[turnIndex],
        ...metadata,
      };

      const updatedSession = {
        ...session,
        turns: updatedTurns,
        updatedAt: Date.now(),
      };

      set({ currentSession: updatedSession });
      saveSession(updatedSession);
    },

    setSelectedAgents: (agents) => {
      set({ selectedAgents: agents });
      const session = get().currentSession;
      if (session) {
        const updatedSession = { ...session, selectedAgents: agents };
        set({ currentSession: updatedSession });
        saveSession(updatedSession);
      }
    },

    toggleAgent: (agentId) => {
      const state = get();
      const current = state.selectedAgents;
      
      // Always require synthesizer to be selected
      if (agentId === 'synthesizer' && current.includes('synthesizer')) {
        return; // Can't deselect synthesizer
      }
      
      // Need at least 2 agents (synthesizer + 1)
      if (current.includes(agentId) && current.length <= 2) {
        return;
      }
      
      const updated = current.includes(agentId)
        ? current.filter(id => id !== agentId)
        : [...current, agentId];
      
      get().setSelectedAgents(updated);
    },

    selectAllAgents: () => {
      get().setSelectedAgents([...AGENT_IDS]);
    },

    deselectAllAgents: () => {
      // Keep only synthesizer
      get().setSelectedAgents(['synthesizer']);
    },

    getPreviousTurnsContext: () => {
      const session = get().currentSession;
      if (!session || session.turns.length === 0) return '';
      
      // Build context from all previous turns
      const contextParts: string[] = [];
      
      session.turns.forEach((turn, index) => {
        if (!turn.isComplete) return; // Only include complete turns
        
        contextParts.push(`\n=== PREVIOUS QUESTION ${index + 1} ===`);
        contextParts.push(`User asked: "${turn.query}"`);
        contextParts.push(`\n--- Agent Responses ---`);
        
        turn.selectedAgents.forEach(agentId => {
          const response = turn.agentResponses[agentId];
          if (response) {
            // Trim to avoid huge context
            const trimmed = response.length > 500 
              ? response.substring(0, 500) + '... [truncated]'
              : response;
            contextParts.push(`\n[${agentId.toUpperCase()}]: ${trimmed}`);
          }
        });
      });
      
      if (contextParts.length === 0) return '';
      
      return `\n=== CONSULTATION HISTORY ===\nThe user is continuing a consultation session. Here is what was previously discussed:${contextParts.join('\n')}\n\n=== NEW QUESTION (BELOW) ===\nNow the user has a follow-up question. Consider the above context when responding.\n`;
    },

    setHistoryPanelOpen: (open) => set({ isHistoryPanelOpen: open }),
    setAgentSelectorOpen: (open) => set({ isAgentSelectorOpen: open }),

    saveCurrentSession: () => {
      const session = get().currentSession;
      if (session) {
        saveSession(session);
      }
    },
  }))
);
