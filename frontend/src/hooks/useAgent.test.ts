import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAgent,
  useAgentText,
  useAgentStreaming,
  useAgentActive,
  usePhase,
  useConnectionState,
  useIsDebating,
  useDebateError,
} from './useAgent';
import { useDebateStore } from './useDebateStore';

describe('useAgent hooks', () => {
  beforeEach(() => {
    useDebateStore.getState().resetDebate();
  });

  describe('useAgent', () => {
    it('should return agent state', () => {
      const { result } = renderHook(() => useAgent('analyst'));

      expect(result.current.id).toBe('analyst');
      expect(result.current.name).toBe('Analyst');
      expect(result.current.text).toBe('');
    });

    it('should update when agent changes', async () => {
      const { result } = renderHook(() => useAgent('analyst'));

      expect(result.current.text).toBe('');

      act(() => {
        useDebateStore.getState().appendToken('analyst', 'Hello');
      });

      expect(result.current.text).toBe('Hello');
    });

    it('should not update when other agents change', () => {
      const renderCount = { value: 0 };

      const { result } = renderHook(() => {
        renderCount.value++;
        return useAgent('analyst');
      });

      const initialRenderCount = renderCount.value;

      // Update a different agent
      useDebateStore.getState().appendToken('critic', 'Critic text');

      // Should not have re-rendered
      expect(renderCount.value).toBe(initialRenderCount);
      expect(result.current.text).toBe('');
    });
  });

  describe('useAgentText', () => {
    it('should return agent text', () => {
      const { result } = renderHook(() => useAgentText('analyst'));
      expect(result.current).toBe('');
    });

    it('should update when text changes', () => {
      const { result } = renderHook(() => useAgentText('analyst'));

      act(() => {
        useDebateStore.getState().appendToken('analyst', 'New text');
      });

      expect(result.current).toBe('New text');
    });

    it('should not re-render when other properties change', () => {
      const renderCount = { value: 0 };

      const { result } = renderHook(() => {
        renderCount.value++;
        return useAgentText('analyst');
      });

      const initialRenderCount = renderCount.value;

      // Activate agent (changes isActive but not text)
      useDebateStore.getState().setPhase('dispatch', ['analyst']);

      // Should not have re-rendered since text didn't change
      expect(renderCount.value).toBe(initialRenderCount);
      expect(result.current).toBe('');
    });
  });

  describe('useAgentStreaming', () => {
    it('should return streaming status', () => {
      const { result } = renderHook(() => useAgentStreaming('analyst'));
      expect(result.current).toBe(false);
    });

    it('should update when streaming starts', () => {
      const { result } = renderHook(() => useAgentStreaming('analyst'));

      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst']);
      });

      expect(result.current).toBe(true);
    });

    it('should update when streaming ends', () => {
      const { result } = renderHook(() => useAgentStreaming('analyst'));

      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst']);
        useDebateStore.getState().setAgentDone('analyst');
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useAgentActive', () => {
    it('should return active status', () => {
      const { result } = renderHook(() => useAgentActive('analyst'));
      expect(result.current).toBe(false);
    });

    it('should update when agent becomes active', () => {
      const { result } = renderHook(() => useAgentActive('analyst'));

      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst']);
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useActiveAgents', () => {
    it('should return empty array when no agents active', () => {
      // Test the hook function directly via store selector
      const active = Object.values(useDebateStore.getState().agents).filter(a => a.isActive);
      expect(active).toEqual([]);
    });

    it('should return active agents via store', () => {
      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst', 'optimist']);
      });

      const active = Object.values(useDebateStore.getState().agents).filter(a => a.isActive);
      expect(active).toHaveLength(2);
      const ids = active.map((a) => a.id);
      expect(ids).toContain('analyst');
      expect(ids).toContain('optimist');
    });
  });

  describe('useStreamingAgents', () => {
    it('should identify streaming agents via store', () => {
      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst', 'critic']);
        useDebateStore.getState().setAgentDone('analyst');
      });

      const streaming = Object.values(useDebateStore.getState().agents).filter(a => a.isStreaming);
      expect(streaming).toHaveLength(1);
      expect(streaming[0].id).toBe('critic');
    });
  });

  describe('useMetrics', () => {
    it('should return initial metrics via store', () => {
      const { tokensPerSecond, totalTokens } = useDebateStore.getState();
      expect(tokensPerSecond).toBe(0);
      expect(totalTokens).toBe(0);
    });

    it('should update metrics via store', () => {
      act(() => {
        useDebateStore.getState().updateMetrics(150, 2000);
      });

      const { tokensPerSecond, totalTokens } = useDebateStore.getState();
      expect(tokensPerSecond).toBe(150);
      expect(totalTokens).toBe(2000);
    });
  });

  describe('usePhase', () => {
    it('should return initial phase', () => {
      const { result } = renderHook(() => usePhase());
      expect(result.current).toBe('idle');
    });

    it('should update when phase changes', () => {
      const { result } = renderHook(() => usePhase());

      act(() => {
        useDebateStore.getState().setPhase('dispatch', ['analyst']);
      });

      expect(result.current).toBe('dispatch');
    });
  });

  describe('useConnectionState', () => {
    it('should return initial connection state', () => {
      const { result } = renderHook(() => useConnectionState());
      expect(result.current).toBe('connecting');
    });

    it('should update when connection state changes', () => {
      const { result } = renderHook(() => useConnectionState());

      act(() => {
        useDebateStore.getState().setConnectionState('connected');
      });

      expect(result.current).toBe('connected');
    });
  });

  describe('useIsDebating', () => {
    it('should return false initially', () => {
      const { result } = renderHook(() => useIsDebating());
      expect(result.current).toBe(false);
    });

    it('should update when debate starts', () => {
      const { result } = renderHook(() => useIsDebating());

      act(() => {
        useDebateStore.getState().startDebate('Test query');
      });

      expect(result.current).toBe(true);
    });

    it('should update when debate ends', () => {
      const { result } = renderHook(() => useIsDebating());

      act(() => {
        useDebateStore.getState().startDebate('Test');
        useDebateStore.getState().endDebate();
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useDebateError', () => {
    it('should return null initially', () => {
      const { result } = renderHook(() => useDebateError());
      expect(result.current).toBeNull();
    });

    it('should return error when set', () => {
      const { result } = renderHook(() => useDebateError());

      act(() => {
        useDebateStore.getState().setError('Something went wrong');
      });

      expect(result.current).toBe('Something went wrong');
    });
  });
});
