import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  type AgentId,
  type AgentState,
  type Phase,
  AGENT_IDS,
  AGENT_COLORS,
  AGENT_NAMES,
} from '@/types/agent';
import type { GraphNode, GraphEdge } from '@/types/graph';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Checkpoint for timeline time-travel
export interface Checkpoint {
  id: string;
  timestamp: number;  // ms since debate start
  type: 'agent_done' | 'round_start' | 'constraint';
  label: string;
  agentId?: AgentId;
  roundName?: string;
  // Snapshot of all agent texts at this moment
  agentTexts: Record<AgentId, string>;
}

interface DebateState {
  // Connection
  connectionState: ConnectionState;

  // Debate state
  phase: Phase;
  query: string;
  isDebating: boolean;

  // Agents (all 8)
  agents: Record<AgentId, AgentState>;

  // Legacy compat (for original HomePage)
  agentText: string;
  isStreaming: boolean;
  currentAgentId: AgentId | null;

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

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  startDebate: (query: string) => void;
  appendToken: (agentId: AgentId, content: string) => void;
  setAgentMetrics: (agentId: AgentId, tokensPerSecond: number, totalTokens: number) => void;
  setPhase: (phase: Phase, activeAgents: AgentId[]) => void;
  setAgentDone: (agentId: AgentId) => void;
  setAgentError: (agentId: AgentId, error: string) => void;
  updateMetrics: (tokensPerSecond: number, totalTokens: number) => void;
  endDebate: () => void;
  resetDebate: () => void;
  setError: (error: string | null) => void;
  clearResponse: () => void;

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
}

const createInitialAgents = (): Record<AgentId, AgentState> => {
  const agents: Partial<Record<AgentId, AgentState>> = {};
  for (const id of AGENT_IDS) {
    agents[id] = {
      id,
      name: AGENT_NAMES[id],
      text: '',
      color: AGENT_COLORS[id],
      phase: null,
      isActive: false,
      isStreaming: false,
      tokenCount: 0,
      tokensPerSecond: 0,
      streamStartTime: null,
    };
  }
  return agents as Record<AgentId, AgentState>;
};

const initialState = {
  connectionState: 'connecting' as ConnectionState,
  phase: 'idle' as Phase,
  query: '',
  isDebating: false,
  agents: createInitialAgents(),
  // Legacy compat
  agentText: '',
  isStreaming: false,
  currentAgentId: null as AgentId | null,
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
};

export const useDebateStore = create<DebateState>()(
  subscribeWithSelector((set, _get) => ({
    ...initialState,

    setConnectionState: (connectionState) => set({ connectionState }),

    startDebate: (query) =>
      set({
        query,
        phase: 'idle',
        isDebating: true,
        agents: createInitialAgents(),
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
      }),

    appendToken: (agentId, content) =>
      set((state) => {
        const agent = state.agents[agentId];
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

    setAgentMetrics: (agentId, tokensPerSecond, totalTokens) =>
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            tokensPerSecond,
            tokenCount: totalTokens,
          },
        },
      })),

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
  }))
);
