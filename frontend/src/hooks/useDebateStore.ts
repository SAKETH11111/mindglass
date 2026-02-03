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

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  startDebate: (query: string) => void;
  appendToken: (agentId: AgentId, content: string) => void;
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
      }),

    appendToken: (agentId, content) =>
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            text: state.agents[agentId].text + content,
            isStreaming: true,
            tokenCount: state.agents[agentId].tokenCount + 1,
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
  }))
);
