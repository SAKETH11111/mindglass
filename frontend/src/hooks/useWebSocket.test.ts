import { describe, it, expect, beforeEach } from 'vitest';
import { useDebateStore } from './useDebateStore';
import type {
  AgentTokenMessage,
  AgentDoneMessage,
  AgentErrorMessage,
  PhaseChangeMessage,
  MetricsMessage,
} from '@/types/websocket';

describe('WebSocket Integration with Store', () => {
  beforeEach(() => {
    useDebateStore.getState().resetDebate();
  });

  describe('Message Handlers', () => {
    it('should handle agent_token message', () => {
      const message: AgentTokenMessage = {
        type: 'agent_token',
        agentId: 'analyst',
        content: 'Test token',
        timestamp: Date.now(),
      };

      // Simulate what useWebSocket does
      useDebateStore.getState().appendToken(message.agentId, message.content);

      const state = useDebateStore.getState();
      expect(state.agents.analyst.text).toBe('Test token');
      expect(state.agents.analyst.isStreaming).toBe(true);
      expect(state.agents.analyst.tokenCount).toBe(1);
    });

    it('should handle agent_done message', () => {
      // First activate the agent
      useDebateStore.getState().setPhase('dispatch', ['analyst']);

      const message: AgentDoneMessage = {
        type: 'agent_done',
        agentId: 'analyst',
        timestamp: Date.now(),
      };

      useDebateStore.getState().setAgentDone(message.agentId);

      expect(useDebateStore.getState().agents.analyst.isStreaming).toBe(false);
    });

    it('should handle agent_error message', () => {
      useDebateStore.getState().setPhase('dispatch', ['analyst']);

      const message: AgentErrorMessage = {
        type: 'agent_error',
        agentId: 'analyst',
        error: 'Connection failed',
        timestamp: Date.now(),
      };

      useDebateStore.getState().setAgentError(message.agentId, message.error);

      const state = useDebateStore.getState();
      expect(state.agents.analyst.isActive).toBe(false);
      expect(state.agents.analyst.isStreaming).toBe(false);
      expect(state.error).toContain('Connection failed');
    });

    it('should handle phase_change message', () => {
      const message: PhaseChangeMessage = {
        type: 'phase_change',
        phase: 'dispatch',
        activeAgents: ['analyst', 'optimist'],
        timestamp: Date.now(),
      };

      useDebateStore.getState().setPhase(message.phase, message.activeAgents);

      const state = useDebateStore.getState();
      expect(state.phase).toBe('dispatch');
      expect(state.agents.analyst.isActive).toBe(true);
      expect(state.agents.analyst.phase).toBe('dispatch');
      expect(state.agents.optimist.isActive).toBe(true);
      expect(state.agents.critic.isActive).toBe(false);
    });

    it('should handle metrics message', () => {
      const message: MetricsMessage = {
        type: 'metrics',
        tokensPerSecond: 150,
        totalTokens: 2000,
        timestamp: Date.now(),
      };

      useDebateStore.getState().updateMetrics(message.tokensPerSecond, message.totalTokens);

      const state = useDebateStore.getState();
      expect(state.tokensPerSecond).toBe(150);
      expect(state.totalTokens).toBe(2000);
    });

    it('should handle debate_complete message', () => {
      useDebateStore.getState().startDebate('Test');
      useDebateStore.getState().setPhase('dispatch', ['analyst']);

      // Simulate what useWebSocket does
      useDebateStore.getState().endDebate();

      const state = useDebateStore.getState();
      expect(state.phase).toBe('complete');
      expect(state.isDebating).toBe(false);
      expect(state.agents.analyst.isStreaming).toBe(false);
    });
  });

  describe('Full Debate Flow', () => {
    it('should handle complete debate lifecycle', () => {
      // Start debate
      useDebateStore.getState().startDebate('Should we pivot?');
      expect(useDebateStore.getState().query).toBe('Should we pivot?');
      expect(useDebateStore.getState().isDebating).toBe(true);

      // Phase 1: Dispatch
      useDebateStore.getState().setPhase('dispatch', ['analyst', 'optimist']);
      expect(useDebateStore.getState().phase).toBe('dispatch');
      expect(useDebateStore.getState().agents.analyst.isActive).toBe(true);
      expect(useDebateStore.getState().agents.optimist.isActive).toBe(true);

      // Tokens arrive
      useDebateStore.getState().appendToken('analyst', 'Analysis shows...');
      useDebateStore.getState().appendToken('optimist', 'I think...');
      expect(useDebateStore.getState().agents.analyst.text).toBe('Analysis shows...');
      expect(useDebateStore.getState().agents.optimist.text).toBe('I think...');

      // Metrics update
      useDebateStore.getState().updateMetrics(120, 500);
      expect(useDebateStore.getState().tokensPerSecond).toBe(120);

      // Phase 2: Conflict
      useDebateStore.getState().setPhase('conflict', ['critic', 'risk']);
      expect(useDebateStore.getState().phase).toBe('conflict');
      expect(useDebateStore.getState().agents.critic.isActive).toBe(true);

      // Agents complete
      useDebateStore.getState().setAgentDone('analyst');
      useDebateStore.getState().setAgentDone('optimist');
      expect(useDebateStore.getState().agents.analyst.isStreaming).toBe(false);

      // Debate ends
      useDebateStore.getState().endDebate();
      expect(useDebateStore.getState().phase).toBe('complete');
      expect(useDebateStore.getState().isDebating).toBe(false);
    });
  });
});
