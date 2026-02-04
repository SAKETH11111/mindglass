import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { AGENT_COLORS, AGENT_NAMES, AGENT_IDS } from '@/types/agent'
import type { AgentId } from '@/types/agent'

// DiceBear Notionists avatar URLs - includes industry-specific agents
const AGENT_AVATARS: Record<string, string> = {
  analyst: 'https://api.dicebear.com/7.x/notionists/svg?seed=analyst&backgroundColor=transparent',
  optimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=sunny&backgroundColor=transparent',
  pessimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=cloudy&backgroundColor=transparent',
  critic: 'https://api.dicebear.com/7.x/notionists/svg?seed=critic&backgroundColor=transparent',
  strategist: 'https://api.dicebear.com/7.x/notionists/svg?seed=planner&backgroundColor=transparent',
  finance: 'https://api.dicebear.com/7.x/notionists/svg?seed=banker&backgroundColor=transparent',
  risk: 'https://api.dicebear.com/7.x/notionists/svg?seed=guardian&backgroundColor=transparent',
  synthesizer: 'https://api.dicebear.com/7.x/notionists/svg?seed=wizard&backgroundColor=transparent',
  // SaaS
  saas_metrics: 'https://api.dicebear.com/7.x/notionists/svg?seed=metrics&backgroundColor=transparent',
  saas_growth: 'https://api.dicebear.com/7.x/notionists/svg?seed=growth&backgroundColor=transparent',
  // E-commerce
  ecommerce_conversion: 'https://api.dicebear.com/7.x/notionists/svg?seed=funnel&backgroundColor=transparent',
  ecommerce_operations: 'https://api.dicebear.com/7.x/notionists/svg?seed=warehouse&backgroundColor=transparent',
  // Fintech
  fintech_compliance: 'https://api.dicebear.com/7.x/notionists/svg?seed=compliance&backgroundColor=transparent',
  fintech_risk: 'https://api.dicebear.com/7.x/notionists/svg?seed=fraud&backgroundColor=transparent',
  // Healthcare
  healthcare_clinical: 'https://api.dicebear.com/7.x/notionists/svg?seed=doctor&backgroundColor=transparent',
  healthcare_regulatory: 'https://api.dicebear.com/7.x/notionists/svg?seed=hipaa&backgroundColor=transparent',
  // Manufacturing
  manufacturing_operations: 'https://api.dicebear.com/7.x/notionists/svg?seed=factory&backgroundColor=transparent',
  manufacturing_quality: 'https://api.dicebear.com/7.x/notionists/svg?seed=quality&backgroundColor=transparent',
  // Consulting
  consulting_client: 'https://api.dicebear.com/7.x/notionists/svg?seed=client&backgroundColor=transparent',
  consulting_delivery: 'https://api.dicebear.com/7.x/notionists/svg?seed=delivery&backgroundColor=transparent',
}

// Agent role descriptions - includes industry-specific agents
const AGENT_DESCRIPTIONS: Record<string, string> = {
  analyst: 'Breaks down complex problems into data-driven insights and identifies key patterns',
  optimist: 'Highlights opportunities, potential upsides, and best-case scenarios',
  pessimist: 'Surfaces risks, downsides, and worst-case scenarios to consider',
  critic: 'Challenges assumptions and stress-tests the logic of every argument',
  strategist: 'Develops actionable plans and long-term strategic frameworks',
  finance: 'Evaluates economic implications, costs, and financial trade-offs',
  risk: 'Assesses threats, vulnerabilities, and mitigation strategies',
  synthesizer: 'Integrates all perspectives into a coherent, balanced conclusion',
  // SaaS
  saas_metrics: 'Analyzes MRR, ARR, CAC, LTV, churn rates and SaaS unit economics',
  saas_growth: 'Evaluates PLG vs sales-led motions, pricing, and market positioning',
  // E-commerce
  ecommerce_conversion: 'Optimizes customer journey, conversion funnels, and CRO strategies',
  ecommerce_operations: 'Manages fulfillment, logistics, inventory, and supply chain',
  // Fintech
  fintech_compliance: 'Navigates KYC/AML, licensing, and regulatory requirements',
  fintech_risk: 'Assesses fraud, credit risk, and financial security implications',
  // Healthcare
  healthcare_clinical: 'Evaluates clinical evidence, patient outcomes, and care pathways',
  healthcare_regulatory: 'Ensures HIPAA, FDA compliance and healthcare regulations',
  // Manufacturing
  manufacturing_operations: 'Optimizes production efficiency, lean processes, and supply chain',
  manufacturing_quality: 'Ensures ISO, safety standards, and quality control compliance',
  // Consulting
  consulting_client: 'Manages client relationships, business development, and retention',
  consulting_delivery: 'Oversees project delivery, resource utilization, and profitability',
}

// Agent expertise tags - includes industry-specific agents
const AGENT_TAGS: Record<string, string[]> = {
  analyst: ['Data', 'Research', 'Patterns'],
  optimist: ['Opportunities', 'Growth', 'Potential'],
  pessimist: ['Caution', 'Risks', 'Contingency'],
  critic: ['Logic', 'Assumptions', 'Validation'],
  strategist: ['Planning', 'Execution', 'Vision'],
  finance: ['Economics', 'ROI', 'Budgets'],
  risk: ['Security', 'Threats', 'Mitigation'],
  synthesizer: ['Integration', 'Balance', 'Summary'],
  // SaaS
  saas_metrics: ['MRR', 'Churn', 'Unit Economics'],
  saas_growth: ['PLG', 'GTM', 'Pricing'],
  // E-commerce
  ecommerce_conversion: ['CRO', 'Funnels', 'UX'],
  ecommerce_operations: ['Fulfillment', 'Logistics', '3PL'],
  // Fintech
  fintech_compliance: ['KYC/AML', 'Licensing', 'Regs'],
  fintech_risk: ['Fraud', 'Credit', 'Security'],
  // Healthcare
  healthcare_clinical: ['Evidence', 'Outcomes', 'Care'],
  healthcare_regulatory: ['HIPAA', 'FDA', 'Compliance'],
  // Manufacturing
  manufacturing_operations: ['Lean', 'Supply Chain', 'OEE'],
  manufacturing_quality: ['ISO', 'QC', 'Safety'],
  // Consulting
  consulting_client: ['BD', 'Retention', 'Strategy'],
  consulting_delivery: ['Utilization', 'PMO', 'Scope'],
}

interface AgentsPanelProps {
  isOpen: boolean
  onClose: () => void
  activeAgentId?: AgentId | null
  designMode?: 'boxy' | 'round'
  visibleAgents?: AgentId[]  // Optional - defaults to AGENT_IDS
}

export function AgentsPanel({ isOpen, onClose, activeAgentId, designMode = 'boxy', visibleAgents }: AgentsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  
  // Use provided agents or default to base agents
  const agentsToShow = visibleAgents || AGENT_IDS

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
        className={`
          relative w-full max-w-3xl max-h-[85vh] overflow-hidden
          shadow-2xl shadow-black/50
          animate-in fade-in zoom-in-95 duration-300
          ${designMode === 'boxy'
            ? 'bg-[#111] border-2 border-white/30'
            : 'backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl'
          }
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agents-panel-title"
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 ${designMode === 'boxy' ? 'border-b-2 border-white/20 bg-white/[0.02]' : 'border-b border-white/10'}`}>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {agentsToShow.slice(0, 3).map((id) => (
                <div
                  key={id}
                  className={`w-6 h-6 border-2 border-black/50 overflow-hidden ${designMode === 'round' ? 'rounded-full' : ''}`}
                  style={{ backgroundColor: AGENT_COLORS[id] }}
                >
                  <img src={AGENT_AVATARS[id]} alt="" className="w-full h-full" />
                </div>
              ))}
            </div>
            <div>
              <h2 id="agents-panel-title" className={`text-white font-semibold text-lg tracking-tight ${designMode === 'boxy' ? 'font-mono uppercase tracking-widest' : ''}`}>
                {designMode === 'boxy' ? 'AGENT ARRAY' : 'AI Agents'}
              </h2>
              <p className={`text-white/50 text-xs ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                {designMode === 'boxy' ? `${agentsToShow.length} PERSPECTIVES ACTIVE` : `${agentsToShow.length} specialized perspectives analyze your decision`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`
              w-8 h-8 flex items-center justify-center
              text-white/50 hover:text-white hover:bg-white/10
              transition-colors duration-150
              ${designMode === 'round' ? 'rounded-lg' : ''}
            `}
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Agent Grid */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agentsToShow.map((agentId, index) => {
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
                    group relative p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2
                    ${designMode === 'boxy'
                      ? `bg-white/[0.02] border-2 hover:bg-white/[0.04] hover:border-white/30 ${isActive ? 'border-white/50 bg-white/[0.05]' : 'border-white/15'}`
                      : `bg-white/5 border rounded-xl hover:bg-white/10 hover:border-white/20 ${isActive ? 'border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'border-white/10'}`
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
                        {designMode === 'boxy' ? (
                          <span className="inline-flex h-full w-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                        ) : (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </>
                        )}
                      </span>
                      <span className={`text-[10px] text-white font-medium uppercase tracking-wider ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                        {designMode === 'boxy' ? 'ACTIVE' : 'Active'}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div
                      className={`
                        w-14 h-14 overflow-hidden flex-shrink-0
                        border-2 transition-transform duration-200
                        group-hover:scale-105
                        ${designMode === 'round' ? 'rounded-lg' : ''}
                      `}
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
                        className={`text-sm mb-1 transition-colors duration-200 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : 'font-semibold'}`}
                        style={{ color }}
                      >
                        {name}
                      </h3>
                      <p className={`text-white/60 text-xs leading-relaxed mb-2 line-clamp-2 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                        {description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`
                              px-2 py-0.5 text-[10px] font-medium
                              transition-colors duration-200
                              ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : 'rounded-md'}
                            `}
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
          <div className={`mt-5 pt-4 ${designMode === 'boxy' ? 'border-t-2 border-white/20' : 'border-t border-white/10'}`}>
            <div className={`flex items-center justify-between text-xs text-white/50 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}>
              <div className="flex items-center gap-1.5">
                <span className={`bg-emerald-400 ${designMode === 'boxy' ? 'w-2 h-2' : 'w-1.5 h-1.5 rounded-full'}`} />
                <span>{designMode === 'boxy' ? 'ALL AGENTS READY' : 'All agents ready'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
