import { describe, it, expect } from 'vitest';
import {
  AGENT_IDS,
  AGENT_COLORS,
  AGENT_NAMES,
  type AgentId,
  type AgentState,
  type Phase,
} from './agent';

describe('Agent Types', () => {
  describe('AGENT_IDS', () => {
    it('should contain all 8 agent IDs', () => {
      expect(AGENT_IDS).toHaveLength(8);
      expect(AGENT_IDS).toContain('analyst');
      expect(AGENT_IDS).toContain('optimist');
      expect(AGENT_IDS).toContain('pessimist');
      expect(AGENT_IDS).toContain('critic');
      expect(AGENT_IDS).toContain('strategist');
      expect(AGENT_IDS).toContain('finance');
      expect(AGENT_IDS).toContain('risk');
      expect(AGENT_IDS).toContain('synthesizer');
    });
  });

  describe('AGENT_COLORS', () => {
    it('should have colors for all 8 agents', () => {
      AGENT_IDS.forEach((id) => {
        expect(AGENT_COLORS[id]).toBeDefined();
        expect(AGENT_COLORS[id]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should match backend color scheme', () => {
      expect(AGENT_COLORS.analyst).toBe('#5F8787');
      expect(AGENT_COLORS.optimist).toBe('#E78A53');
      expect(AGENT_COLORS.pessimist).toBe('#FBCB97');
      expect(AGENT_COLORS.critic).toBe('#EF4444');
      expect(AGENT_COLORS.strategist).toBe('#A855F7');
      expect(AGENT_COLORS.finance).toBe('#EAB308');
      expect(AGENT_COLORS.risk).toBe('#B91C1C');
      expect(AGENT_COLORS.synthesizer).toBe('#C1C1C1');
    });
  });

  describe('AGENT_NAMES', () => {
    it('should have names for all 8 agents', () => {
      AGENT_IDS.forEach((id) => {
        expect(AGENT_NAMES[id]).toBeDefined();
        expect(typeof AGENT_NAMES[id]).toBe('string');
      });
    });
  });

  describe('AgentState interface', () => {
    it('should allow creating a valid agent state', () => {
      const state: AgentState = {
        id: 'analyst',
        name: 'Analyst',
        text: 'Test text',
        color: '#5F8787',
        phase: 'dispatch',
        isActive: true,
        isStreaming: true,
        tokenCount: 10,
      };

      expect(state.id).toBe('analyst');
      expect(state.name).toBe('Analyst');
      expect(state.text).toBe('Test text');
      expect(state.color).toBe('#5F8787');
      expect(state.phase).toBe('dispatch');
      expect(state.isActive).toBe(true);
      expect(state.isStreaming).toBe(true);
      expect(state.tokenCount).toBe(10);
    });

    it('should allow null phase', () => {
      const state: AgentState = {
        id: 'analyst',
        name: 'Analyst',
        text: '',
        color: '#5F8787',
        phase: null,
        isActive: false,
        isStreaming: false,
        tokenCount: 0,
      };

      expect(state.phase).toBeNull();
    });
  });

  describe('Phase type', () => {
    it('should accept all valid phase values', () => {
      const phases: Phase[] = [
        'idle',
        'dispatch',
        'conflict',
        'synthesis',
        'convergence',
        'complete',
      ];

      phases.forEach((phase) => {
        expect(['idle', 'dispatch', 'conflict', 'synthesis', 'convergence', 'complete']).toContain(phase);
      });
    });
  });
});
