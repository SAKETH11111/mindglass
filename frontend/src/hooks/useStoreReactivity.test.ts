import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebateStore } from './useDebateStore';
import { useAgent, useAgentText, usePhase } from './useAgent';

describe('Store Reactivity', () => {
  beforeEach(() => {
    useDebateStore.getState().resetDebate();
  });

  describe('Selective Subscriptions', () => {
    it('useAgent should only re-render when that specific agent changes', () => {
      const renderCounts: Record<string, number> = {
        analyst: 0,
        critic: 0,
      };

      const { result: analystResult } = renderHook(() => {
        renderCounts.analyst++;
        return useAgent('analyst');
      });

      const { result: criticResult } = renderHook(() => {
        renderCounts.critic++;
        return useAgent('critic');
      });

      const initialAnalystRenders = renderCounts.analyst;
      const initialCriticRenders = renderCounts.critic;

      // Update analyst only
      act(() => {
        useDebateStore.getState().appendToken('analyst', 'Hello');
      });

      // Analyst should have re-rendered
      expect(renderCounts.analyst).toBeGreaterThan(initialAnalystRenders);
      expect(analystResult.current.text).toBe('Hello');

      // Critic should NOT have re-rendered
      expect(renderCounts.critic).toBe(initialCriticRenders);
      expect(criticResult.current.text).toBe('');
    });

    it('useAgentText should only re-render when text changes', () => {
      const renderCount = { value: 0 };

      const { result } = renderHook(() => {
        renderCount.value++;
        return useAgentText('analyst');
      });

      const initialRenders = renderCount.value;

      // Activate agent (changes isActive but not text)
      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst']);
      });

      // Should not have re-rendered since text didn't change
      expect(renderCount.value).toBe(initialRenders);
      expect(result.current).toBe('');

      // Now change the text
      act(() => {
        useDebateStore.getState().appendToken('analyst', 'New text');
      });

      // Should have re-rendered
      expect(renderCount.value).toBeGreaterThan(initialRenders);
      expect(result.current).toBe('New text');
    });

    it('usePhase should re-render when phase changes', () => {
      const renderCount = { value: 0 };

      const { result } = renderHook(() => {
        renderCount.value++;
        return usePhase();
      });

      const initialRenders = renderCount.value;
      expect(result.current).toBe('idle');

      // Change phase
      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst']);
      });

      expect(renderCount.value).toBeGreaterThan(initialRenders);
      expect(result.current).toBe('dispatch');
    });

    it('updating different agents should not affect other agent subscribers', () => {
      const agentIds = ['analyst', 'optimist', 'critic', 'pessimist'] as const;
      const renderCounts: Record<string, number> = {};

      // Set up hooks for all agents
      agentIds.forEach((id) => {
        renderCounts[id] = 0;
        renderHook(() => {
          renderCounts[id]++;
          return useAgentText(id);
        });
      });

      const initialCounts = { ...renderCounts };

      // Update only one agent
      act(() => {
        useDebateStore.getState().appendToken('analyst', 'test');
      });

      // Only analyst should have re-rendered
      expect(renderCounts.analyst).toBeGreaterThan(initialCounts.analyst);
      agentIds
        .filter((id) => id !== 'analyst')
        .forEach((id) => {
          expect(renderCounts[id]).toBe(initialCounts[id]);
        });
    });
  });

  describe('Batch Updates', () => {
    it('should handle rapid token updates efficiently', () => {
      const { result } = renderHook(() => useAgentText('analyst'));

      // Simulate rapid token arrival
      act(() => {
        const store = useDebateStore.getState();
        store.appendToken('analyst', 'T');
        store.appendToken('analyst', 'o');
        store.appendToken('analyst', 'k');
        store.appendToken('analyst', 'e');
        store.appendToken('analyst', 'n');
      });

      expect(result.current).toBe('Token');
      expect(useDebateStore.getState().agents.analyst.tokenCount).toBe(5);
    });

    it('should handle multiple agents updating simultaneously', () => {
      const hooks = {
        analyst: renderHook(() => useAgentText('analyst')),
        optimist: renderHook(() => useAgentText('optimist')),
        critic: renderHook(() => useAgentText('critic')),
      };

      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst', 'optimist', 'critic']);
        useDebateStore.getState().appendToken('analyst', 'A');
        useDebateStore.getState().appendToken('optimist', 'B');
        useDebateStore.getState().appendToken('critic', 'C');
      });

      expect(hooks.analyst.result.current).toBe('A');
      expect(hooks.optimist.result.current).toBe('B');
      expect(hooks.critic.result.current).toBe('C');
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across all agents', () => {
      act(() => {
        useDebateStore.getState().startDebate('Test query');
        useDebateStore.getState().setPhase('dispatch', ['analyst', 'optimist']);
      });

      const state = useDebateStore.getState();

      // Verify all agents have correct state
      expect(state.agents.analyst.isActive).toBe(true);
      expect(state.agents.optimist.isActive).toBe(true);
      expect(state.agents.critic.isActive).toBe(false);

      // Verify phase is consistent
      expect(state.phase).toBe('dispatch');
      expect(state.isDebating).toBe(true);
    });

    it('should properly reset all agent states', () => {
      // Set up some state
      act(() => {
        useDebateStore.getState().startDebate('Test');
        useDebateStore.getState().setPhase('dispatch', ['analyst']);
        useDebateStore.getState().appendToken('analyst', 'text');
        useDebateStore.getState().updateMetrics(100, 1000);
      });

      // Reset
      act(() => {
        useDebateStore.getState().resetDebate();
      });

      const state = useDebateStore.getState();

      // Verify complete reset
      expect(state.phase).toBe('idle');
      expect(state.query).toBe('');
      expect(state.isDebating).toBe(false);
      expect(state.tokensPerSecond).toBe(0);
      expect(state.totalTokens).toBe(0);
      expect(state.error).toBeNull();

      // All agents reset
      Object.values(state.agents).forEach((agent) => {
        expect(agent.text).toBe('');
        expect(agent.isActive).toBe(false);
        expect(agent.isStreaming).toBe(false);
        expect(agent.phase).toBeNull();
        expect(agent.tokenCount).toBe(0);
      });
    });
  });
});
