import { X, Check, Users } from 'lucide-react';
import { AGENT_COLORS, AGENT_NAMES, AGENT_IDS } from '@/types/agent';

import { useSessionStore } from '@/hooks/useSessionStore';

// DiceBear Notionists avatar URLs
const AGENT_AVATARS: Record<string, string> = {
  analyst: 'https://api.dicebear.com/7.x/notionists/svg?seed=analyst&backgroundColor=transparent',
  optimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=sunny&backgroundColor=transparent',
  pessimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=cloudy&backgroundColor=transparent',
  critic: 'https://api.dicebear.com/7.x/notionists/svg?seed=critic&backgroundColor=transparent',
  strategist: 'https://api.dicebear.com/7.x/notionists/svg?seed=planner&backgroundColor=transparent',
  finance: 'https://api.dicebear.com/7.x/notionists/svg?seed=banker&backgroundColor=transparent',
  risk: 'https://api.dicebear.com/7.x/notionists/svg?seed=guardian&backgroundColor=transparent',
  synthesizer: 'https://api.dicebear.com/7.x/notionists/svg?seed=wizard&backgroundColor=transparent',
};

// Short descriptions
const AGENT_SHORT_DESC: Record<string, string> = {
  analyst: 'Data & pattern analysis',
  optimist: 'Opportunities & potential',
  pessimist: 'Risks & downsides',
  critic: 'Challenge assumptions',
  strategist: 'Strategic planning',
  finance: 'Financial analysis',
  risk: 'Risk assessment',
  synthesizer: 'Final synthesis',
};

interface AgentManagerWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentManagerWindow({ isOpen, onClose }: AgentManagerWindowProps) {
  const {
    selectedAgents,
    toggleAgent,
    selectAllAgents,
  } = useSessionStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Window */}
      <div className="relative w-[440px] max-h-[80vh] bg-[#0a0a0a] border border-white/20 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#111]">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/60" />
            <span className="font-mono text-xs text-white/80 uppercase tracking-wider">
              CONSULTANT PANEL
            </span>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0d0d0d]">
          <span className="text-[10px] text-white/50 font-mono uppercase">
            {selectedAgents.length}/8 ACTIVE
          </span>
          <button
            onClick={selectAllAgents}
            className="text-[10px] text-[#F15A29]/80 hover:text-[#F15A29] transition-colors font-mono uppercase"
          >
            {selectedAgents.length === 8 ? 'ALL SELECTED' : 'SELECT ALL'}
          </button>
        </div>

        {/* Agent Grid */}
        <div className="p-4 grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
          {AGENT_IDS.map((agentId) => {
            const isSelected = selectedAgents.includes(agentId);
            const isSynthesizer = agentId === 'synthesizer';
            const color = AGENT_COLORS[agentId];

            return (
              <button
                key={agentId}
                onClick={() => !isSynthesizer && toggleAgent(agentId)}
                disabled={isSynthesizer}
                className={`
                  relative flex items-center gap-3 p-3 text-left transition-all group
                  border ${isSelected 
                    ? 'border-white/30 bg-white/5' 
                    : 'border-white/10 hover:border-white/20 bg-transparent'
                  }
                  ${isSynthesizer ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 overflow-hidden"
                    style={{ backgroundColor: color }}
                  >
                    <img 
                      src={AGENT_AVATARS[agentId]} 
                      alt={AGENT_NAMES[agentId]} 
                      className="w-full h-full object-cover object-center" 
                    />
                  </div>
                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#F15A29] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 font-mono text-[11px] uppercase tracking-wide truncate">
                    {AGENT_NAMES[agentId]}
                  </p>
                  <p className="text-white/40 font-mono text-[9px] truncate">
                    {isSynthesizer ? 'Always included' : AGENT_SHORT_DESC[agentId]}
                  </p>
                </div>

                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#F15A29]' : 'bg-white/20'}`} />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 bg-[#0d0d0d]">
          <p className="text-center text-white/30 font-mono text-[10px]">
            Select consultants to include in your analysis
          </p>
        </div>
      </div>
    </div>
  );
}
