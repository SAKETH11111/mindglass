import { describe, it, expect, beforeEach } from 'vitest';
import { useDebateStore } from './useDebateStore';
import { AGENT_IDS } from '@/types/agent';

describe('useDebateStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useDebateStore.getState().resetDebate();
  });

  describe('Initial State', () => {
    it('should have correct initial connection state', () => {
      const state = useDebateStore.getState();
      expect(state.connectionState).toBe('connecting');
    });

    it('should have idle phase initially', () => {
      const state = useDebateStore.getState();
      expect(state.phase).toBe('idle');
    });

    it('should not be debating initially', () => {
      const state = useDebateStore.getState();
      expect(state.isDebating).toBe(false);
    });

    it('should have empty query initially', () => {
      const state = useDebateStore.getState();
      expect(state.query).toBe('');
    });

    it('should initialize all 8 agents', () => {
      const state = useDebateStore.getState();
      expect(Object.keys(state.agents)).toHaveLength(8);
      AGENT_IDS.forEach((id) => {
        expect(state.agents[id]).toBeDefined();
      });
    });

    it('should initialize agents with correct properties', () => {
      const state = useDebateStore.getState();
      AGENT_IDS.forEach((id) => {
        const agent = state.agents[id];
        expect(agent.id).toBe(id);
        expect(agent.name).toBeDefined();
        expect(agent.text).toBe('');
        expect(agent.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(agent.phase).toBeNull();
        expect(agent.isActive).toBe(false);
        expect(agent.isStreaming).toBe(false);
        expect(agent.tokenCount).toBe(0);
        expect(agent.promptTokens).toBe(0);
        expect(agent.completionTokens).toBe(0);
        expect(agent.totalTokens).toBe(0);
        expect(agent.completionTime).toBe(0);
      });
    });

    it('should have zero metrics initially', () => {
      const state = useDebateStore.getState();
      expect(state.tokensPerSecond).toBe(0);
      expect(state.totalTokens).toBe(0);
    });

    it('should have no error initially', () => {
      const state = useDebateStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Connection State', () => {
    it('should update connection state', () => {
      useDebateStore.getState().setConnectionState('connected');
      expect(useDebateStore.getState().connectionState).toBe('connected');

      useDebateStore.getState().setConnectionState('disconnected');
      expect(useDebateStore.getState().connectionState).toBe('disconnected');

      useDebateStore.getState().setConnectionState('error');
      expect(useDebateStore.getState().connectionState).toBe('error');
    });
  });

  describe('Debate Lifecycle', () => {
    it('should start debate with query', () => {
      useDebateStore.getState().startDebate('Should we pivot?');
      const state = useDebateStore.getState();

      expect(state.query).toBe('Should we pivot?');
      expect(state.isDebating).toBe(true);
      expect(state.phase).toBe('idle');
    });

    it('should reset agents when starting new debate', () => {
      // Modify an agent first
      useDebateStore.getState().appendToken('analyst', 'some text');
      useDebateStore.getState().setPhase('dispatch', ['analyst']);

      // Start new debate
      useDebateStore.getState().startDebate('New question');
      const state = useDebateStore.getState();

      expect(state.agents.analyst.text).toBe('');
      expect(state.agents.analyst.isActive).toBe(false);
      expect(state.agents.analyst.phase).toBeNull();
    });

    it('should reset metrics when starting new debate', () => {
      useDebateStore.getState().updateMetrics(100, 1000);
      useDebateStore.getState().startDebate('New question');

      const state = useDebateStore.getState();
      expect(state.tokensPerSecond).toBe(0);
      expect(state.totalTokens).toBe(0);
    });

    it('should end debate and mark complete', () => {
      useDebateStore.getState().startDebate('Test');
      useDebateStore.getState().setPhase('dispatch', ['analyst']);
      useDebateStore.getState().endDebate();

      const state = useDebateStore.getState();
      expect(state.phase).toBe('complete');
      expect(state.isDebating).toBe(false);
    });

    it('should stop streaming for all agents on end', () => {
      useDebateStore.getState().startDebate('Test');
      useDebateStore.getState().setPhase('dispatch', ['analyst', 'optimist']);
      useDebateStore.getState().appendToken('analyst', 'text');

      useDebateStore.getState().endDebate();

      const state = useDebateStore.getState();
      expect(state.agents.analyst.isStreaming).toBe(false);
      expect(state.agents.optimist.isStreaming).toBe(false);
    });

    it('should fully reset debate state', () => {
      // Setup some state
      useDebateStore.getState().startDebate('Test');
      useDebateStore.getState().setPhase('dispatch', ['analyst']);
      useDebateStore.getState().appendToken('analyst', 'text');
      useDebateStore.getState().updateMetrics(50, 500);
      useDebateStore.getState().setError('Some error');

      // Reset
      useDebateStore.getState().resetDebate();
      const state = useDebateStore.getState();

      expect(state.phase).toBe('idle');
      expect(state.query).toBe('');
      expect(state.isDebating).toBe(false);
      expect(state.error).toBeNull();
      expect(state.tokensPerSecond).toBe(0);
      expect(state.totalTokens).toBe(0);
      expect(state.agents.analyst.text).toBe('');
      expect(state.agents.analyst.isActive).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should append token to agent text', () => {
      useDebateStore.getState().appendToken('analyst', 'Hello');
      useDebateStore.getState().appendToken('analyst', ' world');

      expect(useDebateStore.getState().agents.analyst.text).toBe('Hello world');
    });

    it('should mark agent as streaming when appending tokens', () => {
      useDebateStore.getState().appendToken('analyst', 'text');
      expect(useDebateStore.getState().agents.analyst.isStreaming).toBe(true);
    });

    it('should increment token count when appending', () => {
      useDebateStore.getState().appendToken('analyst', 'a');
      useDebateStore.getState().appendToken('analyst', 'b');
      useDebateStore.getState().appendToken('analyst', 'c');

      expect(useDebateStore.getState().agents.analyst.tokenCount).toBe(3);
    });

    it('should handle tokens for different agents independently', () => {
      useDebateStore.getState().appendToken('analyst', 'Analyst says');
      useDebateStore.getState().appendToken('critic', 'Critic says');

      const state = useDebateStore.getState();
      expect(state.agents.analyst.text).toBe('Analyst says');
      expect(state.agents.critic.text).toBe('Critic says');
      expect(state.agents.optimist.text).toBe('');
    });
  });

  describe('Phase Management', () => {
    it('should set phase and activate agents', () => {
      useDebateStore.getState().setPhase('dispatch', ['analyst', 'optimist']);
      const state = useDebateStore.getState();

      expect(state.phase).toBe('dispatch');
      expect(state.agents.analyst.phase).toBe('dispatch');
      expect(state.agents.optimist.phase).toBe('dispatch');
      expect(state.agents.analyst.isActive).toBe(true);
      expect(state.agents.optimist.isActive).toBe(true);
    });

    it('should mark active agents as streaming', () => {
      useDebateStore.getState().setPhase('dispatch', ['analyst']);
      expect(useDebateStore.getState().agents.analyst.isStreaming).toBe(true);
    });

    it('should not affect inactive agents', () => {
      useDebateStore.getState().setPhase('dispatch', ['analyst']);
      const state = useDebateStore.getState();

      expect(state.agents.critic.isActive).toBe(false);
      expect(state.agents.critic.phase).toBeNull();
    });

    it('should handle phase transitions', () => {
      useDebateStore.getState().setPhase('dispatch', ['analyst', 'optimist']);
      expect(useDebateStore.getState().phase).toBe('dispatch');

      useDebateStore.getState().setPhase('conflict', ['critic', 'risk']);
      const state = useDebateStore.getState();
      expect(state.phase).toBe('conflict');
      expect(state.agents.critic.isActive).toBe(true);
      expect(state.agents.risk.isActive).toBe(true);
    });
  });

  describe('Agent Status', () => {
    it('should mark agent as done', () => {
      useDebateStore.getState().setPhase('dispatch', ['analyst']);
      useDebateStore.getState().setAgentDone('analyst');

      expect(useDebateStore.getState().agents.analyst.isStreaming).toBe(false);
    });

    it('should mark agent as error', () => {
      useDebateStore.getState().setPhase('dispatch', ['analyst']);
      useDebateStore.getState().setAgentError('analyst', 'Connection failed');

      const state = useDebateStore.getState();
      expect(state.agents.analyst.isStreaming).toBe(false);
      expect(state.agents.analyst.isActive).toBe(false);
      expect(state.error).toContain('analyst');
      expect(state.error).toContain('Connection failed');
    });
  });

  describe('Metrics', () => {
    it('should update metrics', () => {
      useDebateStore.getState().updateMetrics(150, 2000);
      const state = useDebateStore.getState();

      expect(state.tokensPerSecond).toBe(150);
      expect(state.totalTokens).toBe(2000);
    });

    it('should handle zero metrics', () => {
      useDebateStore.getState().updateMetrics(0, 0);
      const state = useDebateStore.getState();

      expect(state.tokensPerSecond).toBe(0);
      expect(state.totalTokens).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should set error', () => {
      useDebateStore.getState().setError('Something went wrong');
      expect(useDebateStore.getState().error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      useDebateStore.getState().setError('Error');
      useDebateStore.getState().setError(null);
      expect(useDebateStore.getState().error).toBeNull();
    });
  });
});
