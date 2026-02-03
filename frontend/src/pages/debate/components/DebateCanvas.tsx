import { 
  ReactFlow, 
  Background, 
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo } from 'react';
import { AgentNode } from './AgentNode';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';

// DiceBear Notionists avatar URLs for each agent
const AGENT_AVATARS: Record<AgentId, string> = {
  analyst: 'https://api.dicebear.com/7.x/notionists/svg?seed=analyst&backgroundColor=transparent',
  optimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=sunny&backgroundColor=transparent',
  pessimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=cloudy&backgroundColor=transparent',
  critic: 'https://api.dicebear.com/7.x/notionists/svg?seed=critic&backgroundColor=transparent',
  strategist: 'https://api.dicebear.com/7.x/notionists/svg?seed=planner&backgroundColor=transparent',
  finance: 'https://api.dicebear.com/7.x/notionists/svg?seed=banker&backgroundColor=transparent',
  risk: 'https://api.dicebear.com/7.x/notionists/svg?seed=guardian&backgroundColor=transparent',
  synthesizer: 'https://api.dicebear.com/7.x/notionists/svg?seed=wizard&backgroundColor=transparent',
};

// Placeholder agent responses for Phase 1
const PLACEHOLDER_RESPONSES: Record<AgentId, string> = {
  analyst: "Looking at this from multiple angles, we need to consider market conditions, competitive landscape, and internal capabilities. The data suggests a nuanced approach would be optimal...",
  optimist: "This is an exciting opportunity! I see tremendous potential for growth here. With the right execution, we could see significant upside and market leadership...",
  pessimist: "We need to be cautious here. There are substantial risks we haven't fully addressed. What happens if the market shifts? We should consider downside scenarios...",
  critic: "I disagree with the Analyst's framing. The assumption that market conditions will remain stable is flawed. We're missing critical variables in this analysis...",
  strategist: "Looking at the long-term picture, we should position ourselves for multiple outcomes. A phased approach would give us flexibility while managing risk...",
  finance: "From a financial perspective, the ROI projections need scrutiny. Cash flow implications and runway considerations should drive this decision...",
  risk: "I'm flagging several risk factors: regulatory uncertainty, market volatility, and execution complexity. We need mitigation strategies for each...",
  synthesizer: "Synthesizing the perspectives: The opportunity is real but requires careful execution. I recommend a balanced approach that addresses the Critic's concerns while capturing the Optimist's upside...",
};

interface DebateCanvasProps {
  selectedNodeId: AgentId | null;
  onNodeSelect: (nodeId: AgentId | null) => void;
}

// Create initial nodes in a circular layout
function createInitialNodes(): Node[] {
  const centerX = 400;
  const centerY = 300;
  const radius = 250;
  
  return AGENT_IDS.map((agentId, index) => {
    // Place synthesizer in center, others in a circle
    const isSynthesizer = agentId === 'synthesizer';
    const angle = (index / (AGENT_IDS.length - 1)) * 2 * Math.PI - Math.PI / 2;
    
    const x = isSynthesizer ? centerX : centerX + radius * Math.cos(angle);
    const y = isSynthesizer ? centerY : centerY + radius * Math.sin(angle);
    
    return {
      id: agentId,
      type: 'agentNode',
      position: { x, y },
      data: {
        agentId,
        name: AGENT_NAMES[agentId],
        color: AGENT_COLORS[agentId],
        avatar: AGENT_AVATARS[agentId],
        text: PLACEHOLDER_RESPONSES[agentId],
        isStreaming: false,
        isSelected: false,
      },
    };
  });
}

// Create some initial edges showing relationships
function createInitialEdges(): Edge[] {
  return [
    // Analyst connections
    { id: 'analyst-optimist', source: 'analyst', target: 'optimist', type: 'default' },
    { id: 'analyst-pessimist', source: 'analyst', target: 'pessimist', type: 'default' },
    
    // Critic challenges
    { id: 'critic-analyst', source: 'critic', target: 'analyst', type: 'default' },
    { id: 'critic-optimist', source: 'critic', target: 'optimist', type: 'default' },
    
    // Strategist synthesizes
    { id: 'strategist-analyst', source: 'strategist', target: 'analyst', type: 'default' },
    { id: 'strategist-finance', source: 'strategist', target: 'finance', type: 'default' },
    
    // Everyone connects to synthesizer
    { id: 'analyst-synthesizer', source: 'analyst', target: 'synthesizer', type: 'default' },
    { id: 'optimist-synthesizer', source: 'optimist', target: 'synthesizer', type: 'default' },
    { id: 'pessimist-synthesizer', source: 'pessimist', target: 'synthesizer', type: 'default' },
    { id: 'critic-synthesizer', source: 'critic', target: 'synthesizer', type: 'default' },
    { id: 'strategist-synthesizer', source: 'strategist', target: 'synthesizer', type: 'default' },
    { id: 'finance-synthesizer', source: 'finance', target: 'synthesizer', type: 'default' },
    { id: 'risk-synthesizer', source: 'risk', target: 'synthesizer', type: 'default' },
  ];
}

export function DebateCanvas({ selectedNodeId, onNodeSelect }: DebateCanvasProps) {
  const initialNodes = useMemo(() => createInitialNodes(), []);
  const initialEdges = useMemo(() => createInitialEdges(), []);
  
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  
  // Update node selection state
  const nodesWithSelection = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isSelected: node.id === selectedNodeId,
      },
    }));
  }, [nodes, selectedNodeId]);
  
  // Custom node types
  const nodeTypes = useMemo(() => ({
    agentNode: AgentNode,
  }), []);
  
  // Handle node click
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id as AgentId);
  }, [onNodeSelect]);
  
  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background 
          variant={BackgroundVariant.Dots}
          gap={32}
          size={1}
          color="rgba(255,255,255,0.03)"
        />
        <Controls 
          className="!bg-white/5 !border-white/10 !rounded-xl !shadow-2xl [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-white/10"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
