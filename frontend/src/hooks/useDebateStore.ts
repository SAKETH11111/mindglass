import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  type AgentId,
  type AgentState,
  type Phase,
  AGENT_IDS,
  AGENT_COLORS,
  AGENT_NAMES,
  getAgentIdsForIndustry,
} from '@/types/agent';
import type { GraphNode, GraphEdge } from '@/types/graph';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface AgentMetricsPayload {
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  completionTime: number;
}

// Checkpoint for timeline time-travel
export interface Checkpoint {
  id: string;
  timestamp: number;  // ms since debate start
  type: 'agent_done' | 'round_start' | 'constraint';
  label: string;
  agentId?: string;  // Can be any agent ID including industry-specific
  roundName?: string;
  // Snapshot of all agent texts at this moment
  agentTexts: Record<string, string>;
}

// A completed debate turn (for follow-up questions)
export interface DebateTurnSnapshot {
  id: string;
  query: string;
  agentTexts: Record<string, string>;
  timestamp: number;
}

// User's follow-up question node
export interface FollowUpNode {
  id: string;
  text: string;
  timestamp: number;
  turnIndex: number; // Which turn this leads into
}

// Legacy simulated TPS for demo (kept for fallback)
let tpsInterval: ReturnType<typeof setInterval> | null = null;

interface DebateState {
  // Connection
  connectionState: ConnectionState;

  // Debate state
  phase: Phase;
  query: string;
  isDebating: boolean;

  // Agents (can be base or industry-specific)
  agents: Record<string, AgentState>;

  // Currently active industry (to know which agents to display)
  currentIndustry: string | null;

  // Legacy compat (for original HomePage)
  agentText: string;
  isStreaming: boolean;
  currentAgentId: string | null;

  // Metrics
  tokensPerSecond: number;
  totalTokens: number;

  // Error state
  error: string | null;

  // Graph state
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;

  // User constraints (PRD: Interrupt & Inject)
  constraints: string[];

  // UserProxy node for visualization
  userProxyNode: { id: string; text: string; timestamp: number } | null;

  // Timeline checkpoints for time-travel
  checkpoints: Checkpoint[];
  activeCheckpointIndex: number | null;  // null = live, number = viewing checkpoint
  debateStartTime: number | null;

  // Follow-up conversation support
  completedTurns: DebateTurnSnapshot[]; // Previous completed debate turns
  followUpNodes: FollowUpNode[]; // User's follow-up questions
  currentTurnIndex: number; // 0 = first turn, 1 = after first follow-up, etc.

  showApiKeyModal: boolean;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  startDebate: (query: string, industry?: string) => void;
  appendToken: (agentId: string, content: string) => void;
  setAgentMetrics: (agentId: string, metrics: AgentMetricsPayload) => void;
  setPhase: (phase: Phase, activeAgents: string[]) => void;
  setAgentDone: (agentId: string) => void;
  setAgentError: (agentId: string, error: string) => void;
  updateMetrics: (tokensPerSecond: number, totalTokens: number) => void;
  endDebate: () => void;
  resetDebate: () => void;
  setError: (error: string | null) => void;
  clearResponse: () => void;
  initializeAgentsForIndustry: (industry?: string) => void;

  // Graph actions
  addNode: (node: GraphNode) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  updateNodeText: (nodeId: string, text: string) => void;
  updateNodeStreaming: (nodeId: string, isStreaming: boolean) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  clearGraph: () => void;

  // User constraint actions (PRD: Interrupt & Inject)
  addConstraint: (constraint: string) => void;
  setUserProxyNode: (node: { id: string; text: string; timestamp: number } | null) => void;
  clearConstraints: () => void;

  // Checkpoint/timeline actions
  addCheckpoint: (checkpoint: Omit<Checkpoint, 'agentTexts'>) => void;
  jumpToCheckpoint: (index: number) => void;
  exitTimeTravel: () => void;
  clearCheckpoints: () => void;

  // Follow-up conversation actions
  saveCurrentTurn: () => void; // Save current agents as a completed turn
  addFollowUpQuestion: (question: string) => void; // Add a "YOU" node for follow-up
  startFollowUpDebate: (query: string) => void; // Start a new debate round for follow-up
  clearConversation: () => void; // Reset all turns and follow-ups

  // Custom API key actions
  setShowApiKeyModal: (show: boolean) => void;

  // Simulated TPS for demo
  startSimulatedTps: () => void;
  stopSimulatedTps: () => void;
}

const createInitialAgents = (industry?: string): Record<string, AgentState> => {
  const agents: Record<string, AgentState> = {};
  const agentIds = getAgentIdsForIndustry(industry);
  
  for (const id of agentIds) {
    agents[id] = {
      id,
      name: AGENT_NAMES[id] || id,
      text: '',
      color: AGENT_COLORS[id] || '#6B7280',
      phase: null,
      isActive: false,
      isStreaming: false,
      tokenCount: 0,
      tokensPerSecond: 0,
      streamStartTime: null,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      completionTime: 0,
    };
  }
  return agents;
};

const initialState = {
  connectionState: 'connecting' as ConnectionState,
  phase: 'idle' as Phase,
  query: '',
  isDebating: false,
  agents: createInitialAgents(),
  currentIndustry: null as string | null,
  // Legacy compat
  agentText: '',
  isStreaming: false,
  currentAgentId: null as string | null,
  // Metrics
  tokensPerSecond: 0,
  totalTokens: 0,
  error: null,
  nodes: [] as GraphNode[],
  edges: [] as GraphEdge[],
  selectedNodeId: null as string | null,
  // User constraints (PRD: Interrupt & Inject)
  constraints: [] as string[],
  userProxyNode: null as { id: string; text: string; timestamp: number } | null,
  // Timeline checkpoints
  checkpoints: [] as Checkpoint[],
  activeCheckpointIndex: null as number | null,
  debateStartTime: null as number | null,
  // Follow-up conversation
  completedTurns: [] as DebateTurnSnapshot[],
  followUpNodes: [] as FollowUpNode[],
  currentTurnIndex: 0,
  // Custom API key
  showApiKeyModal: false,
};

export const useDebateStore = create<DebateState>()(
  subscribeWithSelector((set, _get) => ({
    ...initialState,

    setConnectionState: (connectionState) => set({ connectionState }),

    startDebate: (query, industry) =>
      set({
        query,
        phase: 'idle',
        isDebating: true,
        agents: createInitialAgents(industry),
        currentIndustry: industry || null,
        tokensPerSecond: 0,
        totalTokens: 0,
        error: null,
        nodes: [],
        edges: [],
        selectedNodeId: null,
        constraints: [],
        userProxyNode: null,
        checkpoints: [],
        activeCheckpointIndex: null,
        debateStartTime: Date.now(),
        // Reset follow-up state for fresh debates
        completedTurns: [],
        followUpNodes: [],
        currentTurnIndex: 0,
      }),

    initializeAgentsForIndustry: (industry) =>
      set({
        agents: createInitialAgents(industry),
        currentIndustry: industry || null,
      }),

    appendToken: (agentId, content) =>
      set((state) => {
        // Handle dynamic agent creation if agent doesn't exist
        let agent = state.agents[agentId];
        if (!agent) {
          agent = {
            id: agentId,
            name: AGENT_NAMES[agentId] || agentId,
            text: '',
            color: AGENT_COLORS[agentId] || '#6B7280',
            phase: null,
            isActive: true,
          isStreaming: true,
          tokenCount: 0,
          tokensPerSecond: 0,
          streamStartTime: Date.now(),
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          completionTime: 0,
        };
      }
        
        const now = Date.now();

        // Initialize streamStartTime if this is the first token
        const streamStartTime = agent.streamStartTime || now;
        const newTokenCount = agent.tokenCount + 1;

        // Calculate tokens per second
        const elapsedSeconds = (now - streamStartTime) / 1000;
        const tokensPerSecond = elapsedSeconds > 0 ? Math.round(newTokenCount / elapsedSeconds) : 0;

        return {
          agents: {
            ...state.agents,
            [agentId]: {
              ...agent,
              text: agent.text + content,
              isStreaming: true,
              tokenCount: newTokenCount,
              tokensPerSecond,
              streamStartTime,
            },
          },
        };
      }),

    setAgentMetrics: (agentId, metrics) =>
      set((state) => {
        const existingAgent = state.agents[agentId];
        const agent = existingAgent || {
          id: agentId,
          name: AGENT_NAMES[agentId] || agentId,
          text: '',
          color: AGENT_COLORS[agentId] || '#6B7280',
          phase: null,
          isActive: true,
          isStreaming: false,
          tokenCount: 0,
          tokensPerSecond: 0,
          streamStartTime: null,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          completionTime: 0,
        };

        const updatedAgents = {
          ...state.agents,
          [agentId]: {
            ...agent,
            tokensPerSecond: metrics.tokensPerSecond,
            tokenCount: metrics.completionTokens,
            promptTokens: metrics.promptTokens,
            completionTokens: metrics.completionTokens,
            totalTokens: metrics.totalTokens,
            completionTime: metrics.completionTime,
          },
        };

        let completionTokensTotal = 0;
        let completionTimeTotal = 0;
        for (const value of Object.values(updatedAgents)) {
          if (value.completionTokens > 0) {
            completionTokensTotal += value.completionTokens;
          }
          if (value.completionTime > 0) {
            completionTimeTotal += value.completionTime;
          }
        }

        const tokensPerSecond = completionTimeTotal > 0
          ? completionTokensTotal / completionTimeTotal
          : 0;

        return {
          agents: updatedAgents,
          tokensPerSecond,
          totalTokens: completionTokensTotal,
        };
      }),

    setPhase: (phase, activeAgents) =>
      set((state) => {
        const updatedAgents = { ...state.agents };

        // Set newly active agents
        for (const agentId of activeAgents) {
          if (updatedAgents[agentId]) {
            updatedAgents[agentId] = {
              ...updatedAgents[agentId],
              phase,
              isActive: true,
              isStreaming: true,
            };
          }
        }

        return { phase, agents: updatedAgents };
      }),

    setAgentDone: (agentId) =>
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            isStreaming: false,
          },
        },
      })),

    setAgentError: (agentId, error) =>
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            isStreaming: false,
            isActive: false,
          },
        },
        error: `${agentId}: ${error}`,
      })),

    updateMetrics: (tokensPerSecond, totalTokens) => set({ tokensPerSecond, totalTokens }),

    endDebate: () =>
      set((state) => {
        const updatedAgents = { ...state.agents };
        for (const agentId of AGENT_IDS) {
          updatedAgents[agentId] = {
            ...updatedAgents[agentId],
            isStreaming: false,
          };
        }
        return {
          phase: 'complete',
          isDebating: false,
          agents: updatedAgents,
        };
      }),

    resetDebate: () => set(initialState),

    setError: (error) => set({ error }),

    clearResponse: () => set({
      agentText: '',
      isStreaming: false,
      currentAgentId: null,
      agents: createInitialAgents(),
    }),

    // Graph actions
    addNode: (node) =>
      set((state) => ({
        nodes: [...state.nodes, node],
      })),

    updateNodePosition: (nodeId, x, y) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, x, y } : node
        ),
      })),

    updateNodeText: (nodeId, text) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, text } : node
        ),
      })),

    updateNodeStreaming: (nodeId, isStreaming) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, isStreaming } : node
        ),
      })),

    removeNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
      })),

    addEdge: (edge) =>
      set((state) => ({
        edges: [...state.edges, edge],
      })),

    removeEdge: (edgeId) =>
      set((state) => ({
        edges: state.edges.filter((edge) => edge.id !== edgeId),
      })),

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

    clearGraph: () =>
      set({
        nodes: [],
        edges: [],
        selectedNodeId: null,
      }),

    // User constraint actions (PRD: Interrupt & Inject)
    addConstraint: (constraint: string) =>
      set((state) => {
        const last = state.constraints[state.constraints.length - 1];
        if (last === constraint) return state;
        return {
          constraints: [...state.constraints, constraint],
        };
      }),

    setUserProxyNode: (node) => set({ userProxyNode: node }),

    clearConstraints: () => set({ constraints: [], userProxyNode: null }),

    // Checkpoint/timeline actions
    addCheckpoint: (checkpoint) =>
      set((state) => {
        // Capture current agent texts as snapshot
        const agentTexts = {} as Record<AgentId, string>;
        for (const id of AGENT_IDS) {
          agentTexts[id] = state.agents[id].text;
        }
        return {
          checkpoints: [...state.checkpoints, { ...checkpoint, agentTexts }],
        };
      }),

    jumpToCheckpoint: (index) =>
      set((state) => {
        const checkpoint = state.checkpoints[index];
        if (!checkpoint) return state;

        // Restore agent texts to checkpoint snapshot
        const restoredAgents = { ...state.agents };
        for (const id of AGENT_IDS) {
          restoredAgents[id] = {
            ...restoredAgents[id],
            text: checkpoint.agentTexts[id] || '',
            isStreaming: false,
          };
        }

        return {
          activeCheckpointIndex: index,
          agents: restoredAgents,
        };
      }),

    exitTimeTravel: () =>
      set((state) => {
        // Restore to latest checkpoint (or live state)
        const latestCheckpoint = state.checkpoints[state.checkpoints.length - 1];
        if (!latestCheckpoint) return { activeCheckpointIndex: null };

        const restoredAgents = { ...state.agents };
        for (const id of AGENT_IDS) {
          restoredAgents[id] = {
            ...restoredAgents[id],
            text: latestCheckpoint.agentTexts[id] || '',
            isStreaming: false,
          };
        }

        return {
          activeCheckpointIndex: null,
          agents: restoredAgents,
        };
      }),

    clearCheckpoints: () => set({ checkpoints: [], activeCheckpointIndex: null }),

    // Follow-up conversation actions
    saveCurrentTurn: () =>
      set((state) => {
        // Capture current agent texts as a completed turn
        const agentTexts = {} as Record<AgentId, string>;
        for (const id of AGENT_IDS) {
          agentTexts[id] = state.agents[id].text;
        }
        
        const newTurn: DebateTurnSnapshot = {
          id: `turn-${state.currentTurnIndex}-${Date.now()}`,
          query: state.query,
          agentTexts,
          timestamp: Date.now(),
        };

        return {
          completedTurns: [...state.completedTurns, newTurn],
        };
      }),

    addFollowUpQuestion: (question: string) =>
      set((state) => {
        const newFollowUp: FollowUpNode = {
          id: `followup-${state.followUpNodes.length}-${Date.now()}`,
          text: question,
          timestamp: Date.now(),
          turnIndex: state.currentTurnIndex + 1, // This leads into the next turn
        };

        return {
          followUpNodes: [...state.followUpNodes, newFollowUp],
        };
      }),

    startFollowUpDebate: (query: string) =>
      set((state) => ({
        // Keep completed turns and follow-ups, but reset current agents for new round
        query,
        phase: 'idle',
        isDebating: true,
        agents: createInitialAgents(),
        tokensPerSecond: 0,
        totalTokens: 0,
        error: null,
        constraints: [],
        userProxyNode: null,
        checkpoints: [],
        activeCheckpointIndex: null,
        debateStartTime: Date.now(),
        currentTurnIndex: state.currentTurnIndex + 1,
        // Keep: completedTurns, followUpNodes, nodes, edges preserved
      })),

    clearConversation: () =>
      set({
        completedTurns: [],
        followUpNodes: [],
        currentTurnIndex: 0,
        nodes: [],
        edges: [],
      }),

    setShowApiKeyModal: (show) => set({ showApiKeyModal: show }),

    // Simulated TPS for demo (random between 1800-2500)
    startSimulatedTps: () => {
      if (tpsInterval) clearInterval(tpsInterval);
      tpsInterval = setInterval(() => {
        // Random TPS between 1800 and 2500
        const simulatedTps = Math.floor(Math.random() * (2500 - 1800 + 1)) + 1800;
        set({ tokensPerSecond: simulatedTps });
      }, 500);
    },
    stopSimulatedTps: () => {
      if (tpsInterval) {
        clearInterval(tpsInterval);
        tpsInterval = null;
      }
      set({ tokensPerSecond: 0 });
    },
  }))
);
