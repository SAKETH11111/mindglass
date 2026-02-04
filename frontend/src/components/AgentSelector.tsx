import { useEffect, useRef } from 'react';
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

// Agent role descriptions - framed as "consultant" expertise
const AGENT_DESCRIPTIONS: Record<string, string> = {
  analyst: 'Breaks down your situation with data-driven insights and pattern recognition',
  optimist: 'Identifies opportunities, growth potential, and best-case outcomes',
  pessimist: 'Surfaces risks, blind spots, and what could go wrong',
  critic: 'Challenges assumptions and stress-tests your reasoning',
  strategist: 'Develops actionable plans and strategic frameworks',
  finance: 'Evaluates costs, ROI, and financial implications',
  risk: 'Assesses threats and recommends mitigation strategies',
  synthesizer: 'Integrates all perspectives into a balanced recommendation',
};

interface AgentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  designMode?: 'boxy' | 'round';
}

export function AgentSelector({ isOpen, onClose, designMode = 'boxy' }: AgentSelectorProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  const {
    selectedAgents,
    toggleAgent,
    selectAllAgents,
    deselectAllAgents,
  } = useSessionStore();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedCount = selectedAgents.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          relative w-full max-w-2xl max-h-[85vh] overflow-hidden
          shadow-2xl shadow-black/50
          animate-in fade-in zoom-in-95 duration-300
          ${designMode === 'boxy'
            ? 'bg-[#111] border-2 border-white/30'
            : 'backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl'
          }
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 ${designMode === 'boxy' ? 'border-b-2 border-white/20' : 'border-b border-white/10'}`}>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-white/60" />
            <div>
              <h2 className={`text-white ${designMode === 'boxy' ? 'font-mono text-sm uppercase tracking-widest' : 'text-lg font-medium'}`}>
                {designMode === 'boxy' ? 'CUSTOMIZE YOUR CONSULTANTS' : 'Customize Your Consultants'}
              </h2>
              <p className={`text-white/40 ${designMode === 'boxy' ? 'font-mono text-[10px] mt-1' : 'text-sm'}`}>
                {designMode === 'boxy' ? `${selectedCount} SELECTED` : `${selectedCount} consultants selected`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 text-white/40 hover:text-white transition-colors ${designMode === 'round' ? 'rounded-lg hover:bg-white/10' : 'hover:bg-white/10'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className={`flex items-center justify-between px-4 py-2 ${designMode === 'boxy' ? 'bg-white/5 border-b border-white/10' : 'bg-white/[0.02] border-b border-white/5'}`}>
          <p className={`text-white/30 ${designMode === 'boxy' ? 'font-mono text-[10px] uppercase' : 'text-xs'}`}>
            {designMode === 'boxy' ? 'QUICK ACTIONS' : 'Quick actions'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllAgents}
              className={`px-3 py-1 text-[11px] text-white/50 hover:text-white transition-colors ${
                designMode === 'boxy'
                  ? 'font-mono uppercase border border-white/20 hover:border-white/40 hover:bg-white/10'
                  : 'rounded border border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {designMode === 'boxy' ? 'SELECT ALL' : 'Select All'}
            </button>
            <button
              onClick={deselectAllAgents}
              className={`px-3 py-1 text-[11px] text-white/50 hover:text-white transition-colors ${
                designMode === 'boxy'
                  ? 'font-mono uppercase border border-white/20 hover:border-white/40 hover:bg-white/10'
                  : 'rounded border border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {designMode === 'boxy' ? 'MINIMAL' : 'Minimal'}
            </button>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENT_IDS.map((agentId) => {
              const isSelected = selectedAgents.includes(agentId);
              const isSynthesizer = agentId === 'synthesizer';
              const color = AGENT_COLORS[agentId];

              return (
                <button
                  key={agentId}
                  onClick={() => toggleAgent(agentId)}
                  disabled={isSynthesizer}
                  className={`
                    group relative p-4 text-left transition-all duration-200
                    ${designMode === 'boxy'
                      ? `border ${isSelected ? 'border-white/50 bg-white/10' : 'border-white/20 hover:border-white/40'}`
                      : `border ${isSelected ? 'border-white/30 bg-white/10 rounded-xl' : 'border-white/10 hover:border-white/20 rounded-xl'}`
                    }
                    ${isSynthesizer ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 flex-shrink-0 overflow-hidden ${designMode === 'round' ? 'rounded-full' : ''}`}
                      style={{ backgroundColor: color }}
                    >
                      <img
                        src={AGENT_AVATARS[agentId]}
                        alt={AGENT_NAMES[agentId]}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-white/90 ${designMode === 'boxy' ? 'font-mono text-xs uppercase tracking-wider' : 'text-sm font-medium'}`}>
                          {AGENT_NAMES[agentId]}
                        </span>
                        {isSynthesizer && (
                          <span className={`text-[9px] px-1.5 py-0.5 bg-white/20 text-white/60 ${designMode === 'boxy' ? 'font-mono uppercase' : 'rounded'}`}>
                            {designMode === 'boxy' ? 'REQUIRED' : 'Required'}
                          </span>
                        )}
                      </div>
                      <p className={`text-white/40 mt-1 line-clamp-2 ${designMode === 'boxy' ? 'font-mono text-[10px]' : 'text-xs'}`}>
                        {AGENT_DESCRIPTIONS[agentId]}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    <div
                      className={`
                        w-5 h-5 flex-shrink-0 flex items-center justify-center
                        transition-all duration-200
                        ${designMode === 'boxy' ? 'border' : 'border rounded'}
                        ${isSelected 
                          ? 'border-white/50 bg-white text-black' 
                          : 'border-white/20 group-hover:border-white/40'
                        }
                      `}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-4 ${designMode === 'boxy' ? 'border-t-2 border-white/20' : 'border-t border-white/10'}`}>
          <p className={`text-white/30 ${designMode === 'boxy' ? 'font-mono text-[10px]' : 'text-xs'}`}>
            {designMode === 'boxy' 
              ? 'SYNTHESIZER ALWAYS INCLUDED TO CREATE FINAL RECOMMENDATION'
              : 'Synthesizer is always included to create your final recommendation'
            }
          </p>
          <button
            onClick={onClose}
            className={`px-4 py-2 bg-white text-black font-medium transition-colors hover:bg-white/90 ${
              designMode === 'boxy' ? 'font-mono text-xs uppercase tracking-wider' : 'text-sm rounded-lg'
            }`}
          >
            {designMode === 'boxy' ? 'DONE' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
