/**
 * DebateCanvas - React Flow canvas with 5-round debate layout
 * 
 * NEW Layout Structure (True Debate):
 * - Round 1 (Opening):      Analyst + Optimist (top row, 2 agents)
 * - Round 2 (Challenge):    Critic + Pessimist (second row, attack arrows UP)
 * - Round 3 (Defense):      Analyst + Optimist (same nodes, defending)
 * - Round 4 (Expert):       Strategist + Finance + Risk (third row)
 * - Round 5 (Final):        Synthesizer (bottom center)
 * 
 * Edges show debate relationships:
 * - Red: Critic/Pessimist attacking Analyst/Optimist
 * - Green: Support relationships
 * - Blue: Dependencies
 */

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeFunc,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentThoughtNode, type AgentThoughtNodeData } from './AgentThoughtNode';
import { SemanticEdge, type SemanticEdgeData } from './SemanticEdge';
import { useDebateStore } from '@/hooks/useDebateStore';
import { type AgentId } from '@/types/agent';

// Register custom node/edge types
const nodeTypes: NodeTypes = {
  agentThought: AgentThoughtNode,
};

const edgeTypes: EdgeTypes = {
  semantic: SemanticEdge,
};

interface DebateCanvasProps {
  onNodeSelect?: (nodeId: string | null) => void;
  designMode?: 'boxy' | 'round';
}

// Card dimensions
const CARD_WIDTH = 280;
const CARD_HEIGHT = 160;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 100;

// Debate Round Structure:
// Round 1: Analyst + Optimist (opening)
// Round 2: Critic + Pessimist (challenge)
// Round 3: Analyst + Optimist (defense - same nodes)
// Round 4: Strategist + Finance + Risk (expert analysis)
// Round 5: Synthesizer (final verdict)

const ROUND_1_AGENTS: AgentId[] = ['analyst', 'optimist'];
const ROUND_2_AGENTS: AgentId[] = ['critic', 'pessimist'];
const ROUND_4_AGENTS: AgentId[] = ['strategist', 'finance', 'risk'];
const ROUND_5_AGENTS: AgentId[] = ['synthesizer'];

// Visual layout positions
const getDebatePosition = (
  agentId: AgentId,
  canvasWidth: number = 1400
): { x: number; y: number } => {
  const centerX = canvasWidth / 2;
  
  // Round 1: Analyst + Optimist at top (2 agents, centered)
  if (ROUND_1_AGENTS.includes(agentId)) {
    const index = ROUND_1_AGENTS.indexOf(agentId);
    const totalWidth = 2 * CARD_WIDTH + HORIZONTAL_GAP;
    const startX = centerX - totalWidth / 2;
    return {
      x: startX + index * (CARD_WIDTH + HORIZONTAL_GAP),
      y: 40,
    };
  }
  
  // Round 2: Critic + Pessimist below (challengers)
  if (ROUND_2_AGENTS.includes(agentId)) {
    const index = ROUND_2_AGENTS.indexOf(agentId);
    const totalWidth = 2 * CARD_WIDTH + HORIZONTAL_GAP;
    const startX = centerX - totalWidth / 2;
    return {
      x: startX + index * (CARD_WIDTH + HORIZONTAL_GAP),
      y: 40 + CARD_HEIGHT + VERTICAL_GAP,
    };
  }
  
  // Round 4: Strategist + Finance + Risk (3 agents, centered)
  if (ROUND_4_AGENTS.includes(agentId)) {
    const index = ROUND_4_AGENTS.indexOf(agentId);
    const totalWidth = 3 * CARD_WIDTH + 2 * HORIZONTAL_GAP;
    const startX = centerX - totalWidth / 2;
    return {
      x: startX + index * (CARD_WIDTH + HORIZONTAL_GAP),
      y: 40 + 2 * (CARD_HEIGHT + VERTICAL_GAP),
    };
  }
  
  // Round 5: Synthesizer at bottom center
  if (ROUND_5_AGENTS.includes(agentId)) {
    return {
      x: centerX - CARD_WIDTH / 2,
      y: 40 + 3 * (CARD_HEIGHT + VERTICAL_GAP),
    };
  }
  
  return { x: centerX, y: 300 };
};

export function DebateCanvas({ onNodeSelect, designMode = 'boxy' }: DebateCanvasProps) {
  const agents = useDebateStore((state) => state.agents);
  const phase = useDebateStore((state) => state.phase);
  const constraints = useDebateStore((state) => state.constraints);
  
  const ALL_AGENTS: AgentId[] = [...ROUND_1_AGENTS, ...ROUND_2_AGENTS, ...ROUND_4_AGENTS, ...ROUND_5_AGENTS];
  
  // Generate nodes
  const generateNodes = useCallback((): Node<AgentThoughtNodeData>[] => {
    const activeAgents = ALL_AGENTS.filter(id => agents[id].text || agents[id].isStreaming);
    const nodes: Node<AgentThoughtNodeData>[] = [];
    
    // Add agent nodes
    activeAgents.forEach((agentId) => {
      const agent = agents[agentId];
      const position = getDebatePosition(agentId);
      
      // Determine round for visual styling
      let nodeRound = 1;
      if (ROUND_2_AGENTS.includes(agentId)) nodeRound = 2;
      if (ROUND_4_AGENTS.includes(agentId)) nodeRound = 4;
      if (ROUND_5_AGENTS.includes(agentId)) nodeRound = 5;
      
      nodes.push({
        id: `node-${agentId}`,
        type: 'agentThought',
        position,
        data: {
          agentId,
          text: agent.text,
          isStreaming: agent.isStreaming,
          phase: nodeRound,
          tokensPerSecond: agent.tokensPerSecond,
          designMode,
        },
        draggable: true,
      });
    });

    // Add UserProxy node if constraints exist
    if (constraints.length > 0) {
      const canvasWidth = 1400;
      const centerX = canvasWidth / 2;
      const latestConstraint = constraints[constraints.length - 1];
      // Position UserProxy to the right side of the canvas
      nodes.push({
        id: 'node-userproxy',
        type: 'agentThought',
        position: {
          x: centerX + CARD_WIDTH + HORIZONTAL_GAP * 2,
          y: 40 + CARD_HEIGHT + VERTICAL_GAP / 2,
        },
        data: {
          agentId: 'userproxy' as AgentId,
          text: latestConstraint,
          isStreaming: false,
          phase: 0,
          tokensPerSecond: 0,
          designMode,
          isUserProxy: true,
        },
        draggable: true,
      });
    }

    return nodes;
  }, [agents, designMode, constraints]);
  
  // Generate edges showing semantic debate relationships (per PRD)
  // - Red "refutes" edges: Challengers attacking openers
  // - Green "supports" edges: Synthesizer connecting conclusions
  // - Blue "depends" edges: Experts building on prior context
  // 
  // LAYOUT (top to bottom):
  //   Row 1: Analyst, Optimist
  //   Row 2: Critic, Pessimist  
  //   Row 3: Strategist, Finance, Risk
  //   Row 4: Synthesizer
  //
  // Edges connect via shortest path (closest handles)
  const generateEdges = useCallback((): Edge<SemanticEdgeData>[] => {
    const edges: Edge<SemanticEdgeData>[] = [];
    
    // ═══ RED REFUTES EDGES: Challengers (Row 2) attack Openers (Row 1) ═══
    // Critic is BELOW Analyst, so: Critic TOP → Analyst BOTTOM
    if ((agents.critic.text || agents.critic.isStreaming) && agents.analyst.text) {
      edges.push({
        id: 'edge-critic-analyst',
        source: 'node-critic',
        sourceHandle: 'top',
        target: 'node-analyst',
        targetHandle: 'bottom-target',
        type: 'semantic',
        data: { edgeType: 'refutes', label: 'challenges' },
      });
    }
    
    // Pessimist is BELOW Optimist, so: Pessimist TOP → Optimist BOTTOM
    if ((agents.pessimist.text || agents.pessimist.isStreaming) && agents.optimist.text) {
      edges.push({
        id: 'edge-pessimist-optimist',
        source: 'node-pessimist',
        sourceHandle: 'top',
        target: 'node-optimist',
        targetHandle: 'bottom-target',
        type: 'semantic',
        data: { edgeType: 'refutes', label: 'challenges' },
      });
    }
    
    // ═══ BLUE DEPENDS EDGES: Experts (Row 3) depend on Openers (Row 1) ═══
    // Experts are BELOW openers, so: Expert TOP → Analyst BOTTOM
    const expertsActive = ROUND_4_AGENTS.filter(id => agents[id].text || agents[id].isStreaming);
    
    for (const expert of expertsActive) {
      if (agents.analyst.text) {
        edges.push({
          id: `edge-${expert}-analyst`,
          source: `node-${expert}`,
          sourceHandle: 'top',
          target: 'node-analyst',
          targetHandle: 'bottom-target',
          type: 'semantic',
          data: { edgeType: 'depends' },
        });
      }
    }
    
    // ═══ GREEN SUPPORTS EDGES: Synthesizer (Row 4) connects to Experts (Row 3) ═══
    // Synthesizer is BELOW experts, so: Synthesizer TOP → Expert BOTTOM
    if (agents.synthesizer.text || agents.synthesizer.isStreaming) {
      for (const expert of expertsActive) {
        if (agents[expert].text) {
          edges.push({
            id: `edge-synthesizer-${expert}`,
            source: 'node-synthesizer',
            sourceHandle: 'top',
            target: `node-${expert}`,
            targetHandle: 'bottom-target',
            type: 'semantic',
            data: { edgeType: 'supports' },
          });
        }
      }
    }

    // ═══ GRAY "CONSTRAINT" EDGES: UserProxy connects only to streaming agents ═══
    if (constraints.length > 0) {
      const streamingAgents = ALL_AGENTS.filter(id => agents[id].isStreaming);
      for (const agentId of streamingAgents) {
        edges.push({
          id: `edge-userproxy-${agentId}`,
          source: 'node-userproxy',
          sourceHandle: 'left',
          target: `node-${agentId}`,
          targetHandle: 'right-target',
          type: 'semantic',
          data: { edgeType: 'constraint', label: 'informs' },
        });
      }
    }
    
    return edges;
  }, [agents, constraints]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentThoughtNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<SemanticEdgeData>>([]);

  useEffect(() => {
    const newNodes = generateNodes();
    const newEdges = generateEdges();
    setNodes(newNodes);
    setEdges(newEdges);
  }, [agents, phase, designMode, generateNodes, generateEdges, setNodes, setEdges]);

  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: selectedNodes }) => {
    if (selectedNodes.length > 0) {
      onNodeSelect?.(selectedNodes[0].id);
    } else {
      onNodeSelect?.(null);
    }
  }, [onNodeSelect]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 0.9 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'semantic' }}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls 
          className="!bg-[#1a1a1a] !border-white/10 !rounded-lg [&_button]:!bg-[#1a1a1a] [&_button]:!border-white/10 [&_button]:!text-white/60 [&_button:hover]:!bg-[#252525]"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
