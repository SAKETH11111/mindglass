/**
 * DebateCanvas - React Flow canvas with structured phased layout
 * 
 * Layout Structure:
 * - Phase 1: Analyst appears at top-center
 * - Phase 2: 6 perspective agents in a row below Analyst (with proper spacing)
 * - Phase 3: Synthesizer appears below all others
 * 
 * No force physics - fixed grid-like layout that doesn't clump
 */

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import { AGENT_COLORS, type AgentId } from '@/types/agent';
import type { EdgeType } from '@/types/graph';

// Register custom node/edge types
const nodeTypes: NodeTypes = {
  agentThought: AgentThoughtNode,
};

const edgeTypes: EdgeTypes = {
  semantic: SemanticEdge,
};

interface DebateCanvasProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

// Card dimensions for spacing calculations
const CARD_WIDTH = 280;
const CARD_HEIGHT = 160;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 80;

// Phase 1 agents (Analyst)
const PHASE_1_AGENTS: AgentId[] = ['analyst'];

// Phase 2 agents (6 perspective agents in a row)
const PHASE_2_AGENTS: AgentId[] = ['optimist', 'pessimist', 'critic', 'strategist', 'finance', 'risk'];

// Phase 3 agents (Synthesizer)
const PHASE_3_AGENTS: AgentId[] = ['synthesizer'];

// Calculate structured positions based on phase
const getPhasePosition = (
  agentId: AgentId,
  canvasWidth: number = 1200
): { x: number; y: number } => {
  const centerX = canvasWidth / 2;
  
  // Phase 1: Analyst at top center
  if (PHASE_1_AGENTS.includes(agentId)) {
    return {
      x: centerX - CARD_WIDTH / 2,
      y: 40,
    };
  }
  
  // Phase 2: 6 agents in a row below analyst
  if (PHASE_2_AGENTS.includes(agentId)) {
    const index = PHASE_2_AGENTS.indexOf(agentId);
    const totalWidth = PHASE_2_AGENTS.length * CARD_WIDTH + (PHASE_2_AGENTS.length - 1) * HORIZONTAL_GAP;
    const startX = centerX - totalWidth / 2;
    
    return {
      x: startX + index * (CARD_WIDTH + HORIZONTAL_GAP),
      y: 40 + CARD_HEIGHT + VERTICAL_GAP, // Below Phase 1
    };
  }
  
  // Phase 3: Synthesizer centered below Phase 2
  if (PHASE_3_AGENTS.includes(agentId)) {
    return {
      x: centerX - CARD_WIDTH / 2,
      y: 40 + CARD_HEIGHT + VERTICAL_GAP + CARD_HEIGHT + VERTICAL_GAP, // Below Phase 2
    };
  }
  
  // Fallback
  return { x: centerX, y: 300 };
};

// Detect semantic relationships from text (simplified keyword matching)
const detectRelationship = (sourceText: string, targetAgent: AgentId): EdgeType | null => {
  if (!sourceText) return null;
  const text = sourceText.toLowerCase();
  const targetName = targetAgent.toLowerCase();
  
  // Look for explicit references
  if (text.includes(`agree with ${targetName}`) || text.includes(`${targetName} makes a good point`) || text.includes(`building on ${targetName}`)) {
    return 'supports';
  }
  if (text.includes(`disagree with ${targetName}`) || text.includes(`${targetName} overlooks`) || text.includes(`contrary to ${targetName}`)) {
    return 'refutes';
  }
  if (text.includes(`assuming ${targetName}`) || text.includes(`based on ${targetName}`) || text.includes(`if ${targetName}`)) {
    return 'depends';
  }
  
  return null;
};

export function DebateCanvas({ onNodeSelect }: DebateCanvasProps) {
  const agents = useDebateStore((state) => state.agents);
  const phase = useDebateStore((state) => state.phase);
  
  // All agent IDs in order of phases
  const ALL_AGENTS: AgentId[] = [...PHASE_1_AGENTS, ...PHASE_2_AGENTS, ...PHASE_3_AGENTS];
  
  // Convert agent states to React Flow nodes with fixed positions
  const generateNodes = useCallback((): Node<AgentThoughtNodeData>[] => {
    // Only show agents that have content or are streaming
    const activeAgents = ALL_AGENTS.filter(id => agents[id].text || agents[id].isStreaming);
    if (activeAgents.length === 0) return [];
    
    return activeAgents.map((agentId) => {
      const agent = agents[agentId];
      const position = getPhasePosition(agentId);
      
      // Determine which phase this agent belongs to
      let nodePhase = 1;
      if (PHASE_2_AGENTS.includes(agentId)) nodePhase = 2;
      if (PHASE_3_AGENTS.includes(agentId)) nodePhase = 3;
      
      return {
        id: `node-${agentId}`,
        type: 'agentThought',
        position,
        data: {
          agentId,
          text: agent.text,
          isStreaming: agent.isStreaming,
          phase: nodePhase,
        },
        draggable: true,
      };
    });
  }, [agents]);
  
  // Generate edges: Analyst -> Phase 2, Phase 2 -> Synthesizer
  const generateEdges = useCallback((): Edge<SemanticEdgeData>[] => {
    const edges: Edge<SemanticEdgeData>[] = [];
    
    // Check which agents are active
    const analystActive = agents.analyst.text || agents.analyst.isStreaming;
    const synthesizerActive = agents.synthesizer.text || agents.synthesizer.isStreaming;
    const activePhase2 = PHASE_2_AGENTS.filter(id => agents[id].text || agents[id].isStreaming);
    
    // Connect Analyst to Phase 2 agents
    if (analystActive) {
      for (const agentId of activePhase2) {
        edges.push({
          id: `edge-analyst-${agentId}`,
          source: 'node-analyst',
          target: `node-${agentId}`,
          type: 'semantic',
          data: {
            edgeType: 'depends',
            animated: agents[agentId].isStreaming,
          },
        });
      }
    }
    
    // Connect Phase 2 agents to Synthesizer
    if (synthesizerActive) {
      for (const agentId of activePhase2) {
        if (agents[agentId].text) {
          edges.push({
            id: `edge-${agentId}-synthesizer`,
            source: `node-${agentId}`,
            target: 'node-synthesizer',
            type: 'semantic',
            data: {
              edgeType: 'supports',
              animated: agents.synthesizer.isStreaming,
            },
          });
        }
      }
      
      // Also connect analyst to synthesizer
      if (analystActive && agents.analyst.text) {
        edges.push({
          id: 'edge-analyst-synthesizer',
          source: 'node-analyst',
          target: 'node-synthesizer',
          type: 'semantic',
          data: {
            edgeType: 'supports',
            animated: agents.synthesizer.isStreaming,
          },
        });
      }
    }
    
    // Add any detected semantic relationships between Phase 2 agents
    for (const sourceId of activePhase2) {
      const sourceText = agents[sourceId].text;
      if (!sourceText) continue;
      
      for (const targetId of activePhase2) {
        if (sourceId === targetId) continue;
        
        const relationship = detectRelationship(sourceText, targetId);
        if (relationship) {
          edges.push({
            id: `edge-${sourceId}-${targetId}`,
            source: `node-${sourceId}`,
            target: `node-${targetId}`,
            type: 'semantic',
            data: {
              edgeType: relationship,
              animated: false,
            },
          });
        }
      }
    }
    
    return edges;
  }, [agents]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentThoughtNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<SemanticEdgeData>>([]);

  // Update nodes and edges when agent states change
  useEffect(() => {
    const newNodes = generateNodes();
    const newEdges = generateEdges();
    
    // Set nodes directly with fixed positions (no position preservation needed)
    setNodes(newNodes);
    setEdges(newEdges);
  }, [agents, phase, generateNodes, generateEdges, setNodes, setEdges]);

  // Handle node selection
  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: selectedNodes }) => {
    if (selectedNodes.length > 0) {
      onNodeSelect?.(selectedNodes[0].id);
    } else {
      onNodeSelect?.(null);
    }
  }, [onNodeSelect]);

  // MiniMap node color function
  const miniMapNodeColor = useCallback((node: Node) => {
    const agentId = (node.data as AgentThoughtNodeData)?.agentId;
    return agentId ? AGENT_COLORS[agentId] : '#666';
  }, []);

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
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'semantic',
        }}
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
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.8)"
          className="!bg-[#0a0a0a] !border-white/10 !rounded-lg"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
