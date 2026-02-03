import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { AGENT_COLORS, AGENT_NAMES, AGENT_IDS } from '@/types/agent'
import type { AgentId } from '@/types/agent'

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
}

// Agent role descriptions
const AGENT_DESCRIPTIONS: Record<AgentId, string> = {
  analyst: 'Breaks down complex problems into data-driven insights and identifies key patterns',
  optimist: 'Highlights opportunities, potential upsides, and best-case scenarios',
  pessimist: 'Surfaces risks, downsides, and worst-case scenarios to consider',
  critic: 'Challenges assumptions and stress-tests the logic of every argument',
  strategist: 'Develops actionable plans and long-term strategic frameworks',
  finance: 'Evaluates economic implications, costs, and financial trade-offs',
  risk: 'Assesses threats, vulnerabilities, and mitigation strategies',
  synthesizer: 'Integrates all perspectives into a coherent, balanced conclusion',
}

// Agent expertise tags
const AGENT_TAGS: Record<AgentId, string[]> = {
  analyst: ['Data', 'Research', 'Patterns'],
  optimist: ['Opportunities', 'Growth', 'Potential'],
  pessimist: ['Caution', 'Risks', 'Contingency'],
  critic: ['Logic', 'Assumptions', 'Validation'],
  strategist: ['Planning', 'Execution', 'Vision'],
  finance: ['Economics', 'ROI', 'Budgets'],
  risk: ['Security', 'Threats', 'Mitigation'],
  synthesizer: ['Integration', 'Balance', 'Summary'],
}

interface AgentsPanelProps {
  isOpen: boolean
  onClose: () => void
  activeAgentId?: AgentId | null
}

export function AgentsPanel({ isOpen, onClose, activeAgentId }: AgentsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="
          relative w-full max-w-3xl max-h-[85vh] overflow-hidden
          backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl
          shadow-2xl shadow-black/50
          animate-in fade-in zoom-in-95 duration-300
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="agents-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {AGENT_IDS.slice(0, 3).map((id) => (
                <div
                  key={id}
                  className="w-6 h-6 rounded-full border-2 border-black/50 overflow-hidden"
                  style={{ backgroundColor: AGENT_COLORS[id] }}
                >
                  <img src={AGENT_AVATARS[id]} alt="" className="w-full h-full" />
                </div>
              ))}
            </div>
            <div>
              <h2 id="agents-panel-title" className="text-white font-semibold text-lg tracking-tight">
                AI Agents
              </h2>
              <p className="text-white/50 text-xs">
                8 specialized perspectives analyze your decision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="
              w-8 h-8 rounded-lg flex items-center justify-center
              text-white/50 hover:text-white hover:bg-white/10
              transition-colors duration-150
            "
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Agent Grid */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENT_IDS.map((agentId, index) => {
              const isActive = activeAgentId === agentId
              const color = AGENT_COLORS[agentId]
              const name = AGENT_NAMES[agentId]
              const description = AGENT_DESCRIPTIONS[agentId]
              const tags = AGENT_TAGS[agentId]
              const avatar = AGENT_AVATARS[agentId]

              return (
                <div
                  key={agentId}
                  className={`
                    group relative p-4 rounded-xl
                    bg-white/5 border transition-all duration-200
                    hover:bg-white/10 hover:border-white/20
                    animate-in fade-in slide-in-from-bottom-2
                    ${isActive 
                      ? 'border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                      : 'border-white/10'
                    }
                  `}
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'backwards'
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      <span className="text-[10px] text-white font-medium uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div
                      className="
                        w-14 h-14 rounded-lg overflow-hidden flex-shrink-0
                        border-2 transition-transform duration-200
                        group-hover:scale-105
                      "
                      style={{ 
                        backgroundColor: color,
                        borderColor: color 
                      }}
                    >
                      <img 
                        src={avatar} 
                        alt={name}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-semibold text-sm mb-1 transition-colors duration-200"
                        style={{ color }}
                      >
                        {name}
                      </h3>
                      <p className="text-white/60 text-xs leading-relaxed mb-2 line-clamp-2">
                        {description}
                      </p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="
                              px-2 py-0.5 rounded-md text-[10px] font-medium
                              transition-colors duration-200
                            "
                            style={{
                              backgroundColor: `${color}20`,
                              color: color,
                              border: `1px solid ${color}40`,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer info */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/50">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>All agents ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
