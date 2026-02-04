import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
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
  analyst: 'Data & patterns',
  optimist: 'Opportunities',
  pessimist: 'Risks & downsides',
  critic: 'Challenges assumptions',
  strategist: 'Strategic planning',
  finance: 'Financial analysis',
  risk: 'Risk assessment',
  synthesizer: 'Final recommendation',
};

interface AgentSelectorDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  designMode?: 'boxy' | 'round';
}

export function AgentSelectorDropdown({ isOpen, onClose, anchorRef, designMode = 'boxy' }: AgentSelectorDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    selectedAgents,
    toggleAgent,
    selectAllAgents,
  } = useSessionStore();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`
        absolute bottom-full right-0 mb-2 w-72 z-50
        animate-in fade-in slide-in-from-bottom-2 duration-200
        ${designMode === 'boxy'
          ? 'bg-[#111] border-2 border-white/30'
          : 'bg-[#111]/95 backdrop-blur-xl border border-white/20 rounded-xl'
        }
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${designMode === 'boxy' ? 'border-b border-white/20' : 'border-b border-white/10'}`}>
        <span className={`text-white/60 ${designMode === 'boxy' ? 'font-mono text-[10px] uppercase tracking-wider' : 'text-xs'}`}>
          {designMode === 'boxy' ? 'SELECT CONSULTANTS' : 'Select Consultants'}
        </span>
        <button
          onClick={selectAllAgents}
          className={`text-[10px] text-white/40 hover:text-white transition-colors ${designMode === 'boxy' ? 'font-mono uppercase' : ''}`}
        >
          {selectedAgents.length === 8 ? (designMode === 'boxy' ? 'ALL SELECTED' : 'All selected') : (designMode === 'boxy' ? 'SELECT ALL' : 'Select all')}
        </button>
      </div>

      {/* Agent Grid */}
      <div className="p-2 grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
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
                flex items-center gap-2 p-2 text-left transition-all
                ${designMode === 'boxy'
                  ? `border ${isSelected ? 'border-white/40 bg-white/10' : 'border-white/10 hover:border-white/30'}`
                  : `${isSelected ? 'bg-white/10 rounded-lg' : 'hover:bg-white/5 rounded-lg'}`
                }
                ${isSynthesizer ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Avatar with selection indicator */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-8 h-8 overflow-hidden ${designMode === 'round' ? 'rounded-full' : ''}`}
                  style={{ backgroundColor: color }}
                >
                  <img src={AGENT_AVATARS[agentId]} alt={AGENT_NAMES[agentId]} className="w-full h-full" />
                </div>
                {isSelected && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white flex items-center justify-center ${designMode === 'round' ? 'rounded-full' : ''}`}>
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>

              {/* Name & desc */}
              <div className="flex-1 min-w-0">
                <p className={`text-white/90 truncate ${designMode === 'boxy' ? 'font-mono text-[10px] uppercase' : 'text-xs font-medium'}`}>
                  {AGENT_NAMES[agentId]}
                </p>
                <p className={`text-white/30 truncate ${designMode === 'boxy' ? 'font-mono text-[8px]' : 'text-[10px]'}`}>
                  {isSynthesizer ? 'Required' : AGENT_SHORT_DESC[agentId]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`px-3 py-2 ${designMode === 'boxy' ? 'border-t border-white/10' : 'border-t border-white/5'}`}>
        <p className={`text-center text-white/30 ${designMode === 'boxy' ? 'font-mono text-[9px]' : 'text-[10px]'}`}>
          {selectedAgents.length}/8 consultants selected
        </p>
      </div>
    </div>
  );
}
