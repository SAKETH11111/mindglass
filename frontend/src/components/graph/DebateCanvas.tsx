/**
 * DebateCanvas - React Flow canvas with 5-round debate layout
 * 
 * NEW Layout Structure (True Debate):
 * - Round 1 (Opening):      Analyst + Optimist (top row, 2 agents)
 * - Round 2 (Challenge):    Critic + Pessimist (second row, attack arrows UP)
 * - Round 3 (Defense):      Analyst + Optimist (same nodes, defending)
 * - Round 4 (Expert):       Strategist + Finance + Risk (third row)
 * - Round 5 (Final):        Synthesizer (bottom center)
 * - [YOU node]:             User's follow-up question (if any)
 * - [Next turn]:            Repeats pattern below YOU node
 * 
 * Edges show debate relationships:
 * - Red: Critic/Pessimist attacking Analyst/Optimist
 * - Green: Support relationships
 * - Blue: Dependencies
 * - Purple: Follow-up connections
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeFunc,
  type ReactFlowInstance,
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

const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 0.9 } as const;
const DEFAULT_EDGE_OPTIONS = { type: 'semantic' } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;

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
// Round 1: Opening agents (analyst + optimist, or industry-specific)
// Round 2: Challenge agents (critic + pessimist)
// Round 3: Same as Round 1 (defense - same nodes)
// Round 4: Expert Analysis (strategist + finance/industry + risk/industry)
// Round 5: Synthesizer (final verdict)

// Base agents for each round (industry-specific agents replace finance/risk)
const ROUND_1_BASE: AgentId[] = ['analyst', 'optimist'];
const ROUND_2_BASE: AgentId[] = ['critic', 'pessimist'];
const ROUND_5_BASE: AgentId[] = ['synthesizer'];

// Industry-specific agents that go in Round 4 (replacing finance/risk)
const INDUSTRY_ROUND_4_AGENTS = [
  'saas_metrics', 'saas_growth',
  'ecommerce_conversion', 'ecommerce_operations', 
  'fintech_compliance', 'fintech_risk',
  'healthcare_clinical', 'healthcare_regulatory',
  'manufacturing_operations', 'manufacturing_quality',
  'consulting_client', 'consulting_delivery',
  'finance', 'risk',  // Also include base finance/risk
];

// Helper to determine which round an agent belongs to
const getAgentRound = (agentId: AgentId | string): number => {
  if (ROUND_1_BASE.includes(agentId as AgentId)) return 1;
  if (ROUND_2_BASE.includes(agentId as AgentId)) return 2;
  if (ROUND_5_BASE.includes(agentId as AgentId)) return 5;
  if (INDUSTRY_ROUND_4_AGENTS.includes(agentId)) return 4;
  return 4; // Default unknown agents to Round 4
};

// Visual layout positions - now works with dynamic agents
const getDebatePosition = (
  agentId: AgentId | string,
  allAgentIds: string[],
  canvasWidth: number = 1400
): { x: number; y: number } => {
  const centerX = canvasWidth / 2;
  const round = getAgentRound(agentId);
  
  // Get agents in the same round
  const agentsInRound = allAgentIds.filter(id => getAgentRound(id) === round);
  const indexInRound = agentsInRound.indexOf(agentId);
  const numInRound = agentsInRound.length;
  
  // Calculate row Y position
  const getRowY = (roundNum: number) => {
    switch (roundNum) {
      case 1: return 40;
      case 2: return 40 + CARD_HEIGHT + VERTICAL_GAP;
      case 4: return 40 + 2 * (CARD_HEIGHT + VERTICAL_GAP);
      case 5: return 40 + 3 * (CARD_HEIGHT + VERTICAL_GAP);
      default: return 300;
    }
  };
  
  // Calculate X position (center the row of agents)
  const totalWidth = numInRound * CARD_WIDTH + (numInRound - 1) * HORIZONTAL_GAP;
  const startX = centerX - totalWidth / 2;
  const x = startX + indexInRound * (CARD_WIDTH + HORIZONTAL_GAP);
  
  return { x, y: getRowY(round) };
};

export function DebateCanvas({ onNodeSelect, designMode = 'boxy' }: DebateCanvasProps) {
  const agents = useDebateStore((state) => state.agents);
  const constraints = useDebateStore((state) => state.constraints);
  const completedTurns = useDebateStore((state) => state.completedTurns);
  const followUpNodes = useDebateStore((state) => state.followUpNodes);
  const currentTurnIndex = useDebateStore((state) => state.currentTurnIndex);
  
  type RFNode = Node<AgentThoughtNodeData>;
  type RFEdge = Edge<SemanticEdgeData>;
  type RFInstance = ReactFlowInstance<RFNode, RFEdge>;

  const reactFlowInstanceRef = useRef<RFInstance | null>(null);
  const hasUserInteractedRef = useRef(false);
  const lastAutoFitNodeCountRef = useRef(0);
  const lastAutoFitConstraintCountRef = useRef(0);

  const handleMoveStart = useCallback((event: unknown) => {
    if (event) hasUserInteractedRef.current = true;
  }, []);

  const handleInit = useCallback((instance: RFInstance) => {
    reactFlowInstanceRef.current = instance;
  }, []);
  
  // Generate nodes
  const nodes = useMemo((): Node<AgentThoughtNodeData>[] => {
    const nodes: Node<AgentThoughtNodeData>[] = [];
    const canvasWidth = 1400;
    const centerX = canvasWidth / 2;
    
    // Height of one complete debate turn (4 rows of agents)
    const TURN_HEIGHT = 4 * (CARD_HEIGHT + VERTICAL_GAP);
    // Extra space for YOU node between turns
    const YOU_NODE_HEIGHT = CARD_HEIGHT + VERTICAL_GAP * 2;
    
    // Calculate Y offset for a given turn
    const getTurnYOffset = (turnIndex: number) => {
      if (turnIndex === 0) return 0;
      // Each previous turn takes TURN_HEIGHT + YOU_NODE_HEIGHT
      return turnIndex * (TURN_HEIGHT + YOU_NODE_HEIGHT);
    };
    
    // Helper to get position with turn offset
    const getPositionForTurn = (agentId: string, allAgentIds: string[], turnIndex: number) => {
      const basePos = getDebatePosition(agentId, allAgentIds, canvasWidth);
      return {
        x: basePos.x,
        y: basePos.y + getTurnYOffset(turnIndex),
      };
    };
    
    // Get all agent IDs from the store (handles industry-specific agents)
    const allAgentIds = Object.keys(agents);
    
    // ═══ Add nodes for COMPLETED turns (faded/collapsed) ═══
    completedTurns.forEach((turn, turnIdx) => {
      // For completed turns, only show synthesizer as a summary card
      const synthText = turn.agentTexts.synthesizer;
      if (synthText) {
        const position = getPositionForTurn('synthesizer', allAgentIds, turnIdx);
        nodes.push({
          id: `node-turn${turnIdx}-synthesizer`,
          type: 'agentThought',
          position,
          data: {
            agentId: 'synthesizer',
            text: synthText,
            isStreaming: false,
            phase: 5,
            tokensPerSecond: 0,
            designMode,
            isCompletedTurn: true,
            turnIndex: turnIdx,
          },
          draggable: false,
        });
      }
    });
    
    // ═══ Add YOU (follow-up) nodes ═══
    followUpNodes.forEach((followUp, idx) => {
      const turnIdx = idx; // Follow-up leads into the next turn
      const yOffset = getTurnYOffset(turnIdx) + TURN_HEIGHT + VERTICAL_GAP;
      
      nodes.push({
        id: followUp.id,
        type: 'agentThought',
        position: {
          x: centerX - CARD_WIDTH / 2,
          y: yOffset,
        },
        data: {
          agentId: 'userproxy' as AgentId,
          text: followUp.text,
          isStreaming: false,
          phase: 0,
          tokensPerSecond: 0,
          designMode,
          isUserProxy: true,
          isFollowUp: true,
        },
        draggable: false,
      });
    });
    
    // ═══ Add nodes for CURRENT turn ═══
    // Filter to agents that have content or are streaming
    const activeAgents = allAgentIds.filter(id => {
      const agent = agents[id];
      return agent && (agent.text || agent.isStreaming);
    });
    
    activeAgents.forEach((agentId) => {
      const agent = agents[agentId];
      const position = getPositionForTurn(agentId, allAgentIds, currentTurnIndex);
      
      // Determine round for visual styling
      const nodeRound = getAgentRound(agentId);
      
      nodes.push({
        id: `node-${agentId}`,
        type: 'agentThought',
        position,
        data: {
          agentId: agentId as AgentId,
          text: agent.text,
          isStreaming: agent.isStreaming,
          phase: nodeRound,
          tokensPerSecond: agent.tokensPerSecond,
          designMode,
        },
        draggable: false,
      });
    });

    // Add UserProxy node if constraints exist (for current turn)
    if (constraints.length > 0) {
      const latestConstraint = constraints[constraints.length - 1];
      const yOffset = getTurnYOffset(currentTurnIndex);
      // Position UserProxy to the right side of the canvas
      nodes.push({
        id: 'node-userproxy',
        type: 'agentThought',
        position: {
          x: centerX + CARD_WIDTH + HORIZONTAL_GAP * 2,
          y: 40 + CARD_HEIGHT + VERTICAL_GAP / 2 + yOffset,
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
        draggable: false,
      });
    }

    return nodes;
  }, [agents, constraints, designMode, completedTurns, followUpNodes, currentTurnIndex]);
  
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
  const edges = useMemo((): Edge<SemanticEdgeData>[] => {
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
    
    // Get all agent IDs from the store
    const allAgentIds = Object.keys(agents);
    
    // ═══ BLUE DEPENDS EDGES: Experts (Row 4) depend on Openers (Row 1) ═══
    // Experts are BELOW openers, so: Expert TOP → Analyst BOTTOM
    const expertsActive = allAgentIds.filter(id => {
      const agent = agents[id];
      return getAgentRound(id) === 4 && agent && (agent.text || agent.isStreaming);
    });
    
    for (const expert of expertsActive) {
      if (agents.analyst?.text) {
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
    if (agents.synthesizer?.text || agents.synthesizer?.isStreaming) {
      for (const expert of expertsActive) {
        if (agents[expert]?.text) {
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
      const streamingAgents = allAgentIds.filter(id => agents[id]?.isStreaming);
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
    
    // ═══ FOLLOW-UP EDGES: Connect previous synthesizer → YOU → new turn ═══
    followUpNodes.forEach((followUp, idx) => {
      // Connect completed turn's synthesizer to the YOU node
      const prevTurnSynthId = `node-turn${idx}-synthesizer`;
      const hasPrevSynth = completedTurns[idx]?.agentTexts?.synthesizer;
      
      if (hasPrevSynth) {
        edges.push({
          id: `edge-synth-to-followup-${idx}`,
          source: prevTurnSynthId,
          sourceHandle: 'bottom',
          target: followUp.id,
          targetHandle: 'top-target',
          type: 'semantic',
          data: { edgeType: 'depends', label: 'leads to' },
        });
      }
      
      // If this is the current turn, connect YOU node to the first agents
      if (idx === currentTurnIndex - 1) {
        // Connect to analyst and optimist (opening agents)
        if (agents.analyst.text || agents.analyst.isStreaming) {
          edges.push({
            id: `edge-followup-to-analyst-${idx}`,
            source: followUp.id,
            sourceHandle: 'bottom',
            target: 'node-analyst',
            targetHandle: 'top-target',
            type: 'semantic',
            data: { edgeType: 'depends' },
          });
        }
        if (agents.optimist.text || agents.optimist.isStreaming) {
          edges.push({
            id: `edge-followup-to-optimist-${idx}`,
            source: followUp.id,
            sourceHandle: 'bottom',
            target: 'node-optimist',
            targetHandle: 'top-target',
            type: 'semantic',
            data: { edgeType: 'depends' },
          });
        }
      }
    });
    
    return edges;
  }, [agents, constraints, completedTurns, followUpNodes, currentTurnIndex]);

  // Reset auto-fit between debates
  useEffect(() => {
    if (nodes.length === 0 && constraints.length === 0) {
      hasUserInteractedRef.current = false;
      lastAutoFitNodeCountRef.current = 0;
      lastAutoFitConstraintCountRef.current = 0;
    }
  }, [nodes.length, constraints.length]);

  // Auto-fit when new cards or constraints appear until user interacts
  useEffect(() => {
    if (hasUserInteractedRef.current) return;
    if (nodes.length === 0) return;

    const nodeCountChanged = nodes.length !== lastAutoFitNodeCountRef.current;
    const constraintCountChanged = constraints.length !== lastAutoFitConstraintCountRef.current;

    if (nodeCountChanged || constraintCountChanged) {
      lastAutoFitNodeCountRef.current = nodes.length;
      lastAutoFitConstraintCountRef.current = constraints.length;
      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, maxZoom: 0.9, duration: 350 });
      });
    }
  }, [nodes.length, constraints.length]);

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
        onSelectionChange={onSelectionChange}
        onMoveStart={handleMoveStart}
        onInit={handleInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        proOptions={PRO_OPTIONS}
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
