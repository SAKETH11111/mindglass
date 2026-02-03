import { X } from 'lucide-react';
import { AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';

// DiceBear Notionists avatar URLs
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

// Placeholder responses (same as canvas, will be unified later)
const PLACEHOLDER_RESPONSES: Record<AgentId, string> = {
  analyst: "Looking at this from multiple angles, we need to consider market conditions, competitive landscape, and internal capabilities. The data suggests a nuanced approach would be optimal. Key factors include current burn rate, market timing, and team capacity. I recommend breaking this down into three core sub-problems: immediate resource allocation, 6-month positioning strategy, and long-term competitive moat development.",
  optimist: "This is an exciting opportunity! I see tremendous potential for growth here. With the right execution, we could see significant upside and market leadership. The market timing is favorable, and early movers in this space have historically captured outsized returns. If we move decisively, we can establish a strong first-mover advantage.",
  pessimist: "We need to be cautious here. There are substantial risks we haven't fully addressed. What happens if the market shifts? We should consider downside scenarios before committing resources. I've seen similar situations result in significant losses when teams moved too aggressively without proper risk assessment.",
  critic: "I disagree with the Analyst's framing. The assumption that market conditions will remain stable is flawed. We're missing critical variables in this analysis. Additionally, the Optimist's projections seem overly rosy given current economic indicators. We need to stress-test these assumptions before proceeding.",
  strategist: "Looking at the long-term picture, we should position ourselves for multiple outcomes. A phased approach would give us flexibility while managing risk. I suggest a three-phase rollout: initial MVP validation, followed by controlled scaling, then full market expansion once unit economics are proven.",
  finance: "From a financial perspective, the ROI projections need scrutiny. Cash flow implications and runway considerations should drive this decision. At current burn rate, we have 18 months of runway. Any new initiative needs to either extend runway or demonstrate clear path to profitability within 12 months.",
  risk: "I'm flagging several risk factors: regulatory uncertainty, market volatility, and execution complexity. We need mitigation strategies for each. Specifically, I recommend establishing contingency reserves of 20% of allocated budget and defining clear go/no-go decision points at 30, 60, and 90 day intervals.",
  synthesizer: "Synthesizing the perspectives shared: The opportunity is real but requires careful execution. I recommend a balanced approach that addresses the Critic's concerns while capturing the Optimist's upside potential. Key action items: 1) Validate core assumptions with a small pilot, 2) Establish clear metrics and decision criteria, 3) Build in flexibility to pivot based on early data.",
};

interface InspectorPanelProps {
  selectedNodeId: AgentId | null;
  onClose: () => void;
}

export function InspectorPanel({ selectedNodeId, onClose }: InspectorPanelProps) {
  // Empty state when nothing selected
  if (!selectedNodeId) {
    return (
      <div className="
        w-80 flex-shrink-0
        border-l border-white/[0.06]
        bg-black/20
        backdrop-blur-sm
        flex flex-col items-center justify-center
        p-6
      ">
        <div className="text-center space-y-3">
          <div className="
            w-16 h-16 mx-auto
            rounded-2xl
            bg-white/[0.03]
            border border-white/[0.08]
            flex items-center justify-center
          ">
            <span className="text-2xl opacity-40">👆</span>
          </div>
          <p className="text-sm text-white/40">
            Click a node to inspect
          </p>
          <p className="text-xs text-white/25">
            See full agent response and relationships
          </p>
        </div>
      </div>
    );
  }

  const name = AGENT_NAMES[selectedNodeId];
  const color = AGENT_COLORS[selectedNodeId];
  const avatar = AGENT_AVATARS[selectedNodeId];
  const text = PLACEHOLDER_RESPONSES[selectedNodeId];

  return (
    <div className="
      w-80 flex-shrink-0
      border-l border-white/[0.06]
      bg-black/20
      backdrop-blur-sm
      flex flex-col
      animate-in slide-in-from-right-4 duration-300
    ">
      {/* Header */}
      <div className="
        flex-shrink-0
        p-4
        border-b border-white/[0.06]
        flex items-center gap-3
      ">
        {/* Avatar */}
        <div 
          className="
            w-12 h-12 
            rounded-xl 
            overflow-hidden
            border-2
            bg-white/5
            flex-shrink-0
          "
          style={{
            borderColor: color,
            boxShadow: `0 0 20px ${color}30`,
          }}
        >
          <img 
            src={avatar} 
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Name */}
        <div className="flex-1 min-w-0">
          <h2 
            className="text-lg font-semibold text-white truncate"
            style={{ textShadow: `0 0 24px ${color}50` }}
          >
            {name}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-white/50">
              Active Agent
            </span>
          </div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="
            w-8 h-8
            rounded-lg
            flex items-center justify-center
            text-white/40
            hover:text-white/80
            hover:bg-white/10
            transition-all duration-200
          "
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Full Response */}
        <div>
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Response
          </h3>
          <div className="
            p-4
            rounded-xl
            bg-white/[0.03]
            border border-white/[0.08]
          ">
            <p className="text-sm text-white/80 leading-relaxed font-mono whitespace-pre-wrap">
              {text}
            </p>
          </div>
        </div>
        
        {/* Relationships (placeholder for Phase 3) */}
        <div>
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Relationships
          </h3>
          <div className="space-y-2">
            <div className="
              px-3 py-2
              rounded-lg
              bg-emerald-500/10
              border border-emerald-500/20
              flex items-center gap-2
            ">
              <span className="text-emerald-400 text-xs">→ supports</span>
              <span className="text-white/60 text-xs">Strategist</span>
            </div>
            <div className="
              px-3 py-2
              rounded-lg
              bg-red-500/10
              border border-red-500/20
              flex items-center gap-2
            ">
              <span className="text-red-400 text-xs">→ refutes</span>
              <span className="text-white/60 text-xs">Critic</span>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div>
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Stats
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="
              px-3 py-2
              rounded-lg
              bg-white/[0.03]
              border border-white/[0.08]
            ">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Tokens</p>
              <p className="text-sm font-mono text-white/80">{text.split(' ').length * 1.3 | 0}</p>
            </div>
            <div className="
              px-3 py-2
              rounded-lg
              bg-white/[0.03]
              border border-white/[0.08]
            ">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Latency</p>
              <p className="text-sm font-mono text-white/80">1.2s</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.06]">
        <div 
          className="
            h-1 w-full rounded-full overflow-hidden
            bg-white/[0.05]
          "
        >
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: '100%',
              background: `linear-gradient(90deg, ${color}, ${color}60)`,
            }}
          />
        </div>
        <p className="text-[10px] text-white/30 mt-2 text-center">
          Response complete
        </p>
      </div>
    </div>
  );
}
