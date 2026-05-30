import { useState, useCallback, useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Send, Clock } from 'lucide-react'
import { AGENT_COLORS, AGENT_NAMES, getAgentIdsForIndustry, type AgentId } from './types/agent'
import { DebatePage } from '@/pages/debate'
import { HistorySidebar } from '@/components/HistorySidebar'
import { AgentManagerWindow } from '@/components/AgentManagerWindow'
import { ModelSelector } from '@/components/ModelSelector'
import { IndustrySelector, type IndustryType } from '@/components/IndustrySelector'
import { RainbowMatrixShader } from '@/components/ui/rainbow-matrix-shader'
import { DotMatrixText } from '@/components/DotMatrixText'
import { useSessionStore } from '@/hooks/useSessionStore'
import { useDebateStore } from '@/hooks/useDebateStore'
import { ApiKeyModal } from '@/components/ApiKeyModal'
import { BackendWakePage } from '@/pages/BackendWake'
import { DEFAULT_MODEL_ID, type ModelTier } from '@/lib/models'

// DiceBear Notionists avatar URLs for each agent (including industry-specific)
const AGENT_AVATARS: Record<string, string> = {
  // Base agents
  analyst: 'https://api.dicebear.com/7.x/notionists/svg?seed=analyst&backgroundColor=transparent',
  optimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=sunny&backgroundColor=transparent',
  pessimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=cloudy&backgroundColor=transparent',
  critic: 'https://api.dicebear.com/7.x/notionists/svg?seed=critic&backgroundColor=transparent',
  strategist: 'https://api.dicebear.com/7.x/notionists/svg?seed=planner&backgroundColor=transparent',
  finance: 'https://api.dicebear.com/7.x/notionists/svg?seed=banker&backgroundColor=transparent',
  risk: 'https://api.dicebear.com/7.x/notionists/svg?seed=guardian&backgroundColor=transparent',
  synthesizer: 'https://api.dicebear.com/7.x/notionists/svg?seed=leader&backgroundColor=transparent',
  // SaaS industry agents
  saas_metrics: 'https://api.dicebear.com/7.x/notionists/svg?seed=metrics&backgroundColor=transparent',
  saas_growth: 'https://api.dicebear.com/7.x/notionists/svg?seed=rocket&backgroundColor=transparent',
  // E-commerce industry agents
  ecommerce_conversion: 'https://api.dicebear.com/7.x/notionists/svg?seed=funnel&backgroundColor=transparent',
  ecommerce_operations: 'https://api.dicebear.com/7.x/notionists/svg?seed=warehouse&backgroundColor=transparent',
  // Fintech industry agents
  fintech_compliance: 'https://api.dicebear.com/7.x/notionists/svg?seed=shield&backgroundColor=transparent',
  fintech_risk: 'https://api.dicebear.com/7.x/notionists/svg?seed=fraud&backgroundColor=transparent',
  // Healthcare industry agents
  healthcare_clinical: 'https://api.dicebear.com/7.x/notionists/svg?seed=doctor&backgroundColor=transparent',
  healthcare_regulatory: 'https://api.dicebear.com/7.x/notionists/svg?seed=hipaa&backgroundColor=transparent',
  // Manufacturing industry agents
  manufacturing_operations: 'https://api.dicebear.com/7.x/notionists/svg?seed=factory&backgroundColor=transparent',
  manufacturing_quality: 'https://api.dicebear.com/7.x/notionists/svg?seed=quality&backgroundColor=transparent',
  // Consulting industry agents
  consulting_client: 'https://api.dicebear.com/7.x/notionists/svg?seed=handshake&backgroundColor=transparent',
  consulting_delivery: 'https://api.dicebear.com/7.x/notionists/svg?seed=presentation&backgroundColor=transparent',
}

interface PendingSubmission {
  query: string;
  model: ModelTier;
  agents: AgentId[];
  industry: IndustryType;
  demo?: boolean;
}

function HomePage() {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('any')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAgentWindowOpen, setIsAgentWindowOpen] = useState(false)
  const navigate = useNavigate()
  const selectedTier: ModelTier = DEFAULT_MODEL_ID

  // Session management
  const {
    selectedAgents,
    setSelectedAgents,
    sessionHistory,
    createSession,
    loadSession,
    loadAllSessions,
  } = useSessionStore()

  // Update selected agents when industry changes
  const handleIndustryChange = useCallback((industry: IndustryType) => {
    setSelectedIndustry(industry)
    const industryAgents = getAgentIdsForIndustry(industry)
    setSelectedAgents(industryAgents)
  }, [setSelectedAgents])

  // Get visible agents for the current industry (for avatar display)
  const visibleAgents = useMemo(() => {
    return getAgentIdsForIndustry(selectedIndustry)
  }, [selectedIndustry])

  const activePerspectiveCount = useMemo(() => {
    return selectedAgents.filter((agent) => visibleAgents.includes(agent)).length
  }, [selectedAgents, visibleAgents])

  // Load sessions on mount
  useEffect(() => {
    loadAllSessions()
  }, [loadAllSessions])


  // Debate store reset function
  const resetDebate = useDebateStore((state) => state.resetDebate)

  const startSubmission = useCallback((submission: PendingSubmission) => {
    resetDebate()

    const session = createSession(submission.query, submission.agents, submission.model)
    const agentsParam = `&agents=${submission.agents.join(',')}`
    const industryParam = submission.industry !== 'any' ? `&industry=${submission.industry}` : ''
    const sessionParam = session ? `&session=${session.id}` : ''
    const demoParam = submission.demo ? '&demo=1' : ''

    navigate(`/loading?q=${encodeURIComponent(submission.query)}&model=${submission.model}${agentsParam}${industryParam}${sessionParam}${demoParam}`)
  }, [createSession, navigate, resetDebate])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const submission: PendingSubmission = {
      query: trimmed,
      model: selectedTier,
      agents: selectedAgents,
      industry: selectedIndustry,
    }

    startSubmission(submission)
  }, [inputValue, selectedAgents, selectedIndustry, selectedTier, startSubmission])

  const handleSelectSession = useCallback((sessionId: string) => {
    const session = loadSession(sessionId)
    if (session) {
      // Navigate to the session - use last turn's query if available, otherwise use title
      const query = session.turns.length > 0 
        ? session.turns[session.turns.length - 1].query 
        : session.title;
      // Always include agents param to ensure correct selection
      const agentsParam = `&agents=${session.selectedAgents.join(',')}`
      navigate(`/loading?q=${encodeURIComponent(query)}&model=${session.modelTier}${agentsParam}&session=${sessionId}`)
    } else {
      return
    }
  }, [loadSession, navigate])

  const handleNewSession = useCallback(() => {
    setInputValue('')
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Rainbow Matrix Shader Background */}
      <RainbowMatrixShader />

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        designMode="boxy"
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30">
        {/* Subtle top line accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="px-6 py-3">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                Multi-perspective reasoning
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 transition-colors hover:border-white/20 hover:text-white/72"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Recent sessions</span>
                {sessionHistory.length > 0 && (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/70">
                    {sessionHistory.length > 99 ? '99+' : sessionHistory.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="h-12 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      </header>

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-24">
        <div className="w-full max-w-2xl space-y-8">
          {/* Title */}
          <div className="text-center space-y-4">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 py-8">
              <DotMatrixText
                text="PRISM"
                dotWidth={16}
                dotHeight={14}
                dotGap={4}
                letterGap={24}
                revealDelay={35}
                activeColor="#ffffff"
                inactiveColor="rgba(255,255,255,0.08)"
              />
            </div>
            <p className="text-sm max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 text-white/40 font-mono">
              Every angle of your decision, debated in real time
            </p>
          </div>

          {/* Input Card */}
          <div
            className={`
              p-4 pb-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-250
              transition-all duration-200
              bg-[#111] border-2 border-white/30
              ${isFocused ? 'border-white/60 shadow-[0_0_40px_rgba(255,255,255,0.1)]' : ''}
            `}
          >
            <form onSubmit={handleSubmit}>
              {/* Input row */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="What decision are you weighing?"
                  className="
                    flex-1 bg-transparent text-white outline-none text-base py-2
                    disabled:opacity-60
                    placeholder-white/30 tracking-wide font-mono
                  "
                />
              </div>

              {/* Bottom bar with icons and submit */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-white/10">
                {/* Left side - attach button and model selector */}
                <div className="flex items-center gap-2">
                  {/* Industry Selector */}
                  <IndustrySelector
                    selectedIndustry={selectedIndustry}
                    onIndustryChange={handleIndustryChange}
                  />

                  {/* Model Selector */}
                  <ModelSelector
                    selectedTier={selectedTier}
                  />
                </div>

                {/* Right side - agent avatars (clickable selector) and submit */}
                <div className="flex items-center gap-3 relative">
                  {/* Agent avatars - clickable to open window */}
                  <button
                    type="button"
                    onClick={() => setIsAgentWindowOpen(true)}
                    className="flex items-center -space-x-0.5 hover:opacity-90 transition-opacity group"
                    title="Curate perspectives"
                  >
                    {visibleAgents.slice(0, 4).map((agent) => {
                      const avatar = AGENT_AVATARS[agent]
                      const color = AGENT_COLORS[agent]
                      const name = AGENT_NAMES[agent]

                      return (
                        <div key={agent} className="relative">
                          <div
                            className="
                              w-6 h-6 overflow-hidden
                              transition-all duration-200 cursor-pointer
                              border border-white/30 group-hover:border-white/50
                            "
                            style={{ backgroundColor: color }}
                          >
                            <img src={avatar} alt={name} className="w-full h-full object-cover object-center" />
                          </div>
                        </div>
                      )
                    })}
                    {/* Show remaining count or add indicator */}
                    {selectedAgents.length > 4 ? (
                      <div className="w-6 h-6 flex items-center justify-center bg-white/10 text-[9px] text-white font-medium group-hover:bg-white/20 transition-colors border border-white/30">
                        +{selectedAgents.length - 4}
                      </div>
                    ) : selectedAgents.length < 8 ? (
                      <div className="w-6 h-6 flex items-center justify-center bg-white/5 text-[9px] text-white/40 border border-dashed border-white/20 group-hover:border-white/40 transition-colors">
                        +
                      </div>
                    ) : (
                      <div className="w-6 h-6 flex items-center justify-center bg-white/10 text-[9px] text-white font-medium border border-white/30">
                        +4
                      </div>
                    )}
                  </button>

                  {/* Agent Manager Window */}
                  <AgentManagerWindow
                    isOpen={isAgentWindowOpen}
                    onClose={() => setIsAgentWindowOpen(false)}
                    industry={selectedIndustry}
                  />

                  <div className="hidden sm:flex items-center gap-2 px-2 py-1 border border-white/10 bg-white/5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                      Perspectives
                    </span>
                    <span className="font-mono text-[10px] text-white/75">
                      {activePerspectiveCount}/{visibleAgents.length}
                    </span>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className={`
                      flex items-center justify-center
                      w-8 h-8
                      transition-all duration-200
                      ${inputValue.trim()
                        ? 'bg-white text-black hover:bg-white/90'
                        : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/20'
                      }
                    `}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* History quick link (more visible than header) */}
          <div className="flex justify-center animate-in fade-in duration-700 delay-350">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors font-mono text-xs uppercase tracking-wider"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Recent sessions</span>
              {sessionHistory.length > 0 && (
                <span className="w-5 h-5 bg-white/10 text-white/60 text-[10px] font-mono flex items-center justify-center">
                  {sessionHistory.length > 99 ? '99+' : sessionHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Example prompts */}
          <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-700 delay-400 max-w-xl mx-auto">
            {[
              "Should we raise prices or hold steady?",
              "Is now the time to expand into a new market?",
              "Should I take the offer or counter?",
              "Build it in-house or buy off the shelf?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => startSubmission({
                  query: prompt,
                  model: selectedTier,
                  agents: selectedAgents,
                  industry: selectedIndustry,
                  demo: true,
                })}
                className="text-left px-3 py-2.5 text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors bg-[#111] border border-white/10 hover:border-white/30"
              >
                {prompt}
              </button>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}

// Main App with Router
function App() {
  return (
    <BrowserRouter>
      <ApiKeyModal />
      <Routes>
        {/* Root - Home page */}
        <Route path="/" element={<HomePage />} />

        {/* Backend warm-up */}
        <Route path="/loading" element={<BackendWakePage />} />

        {/* Debate Canvas - Main experience */}
        <Route path="/debate" element={<DebatePage />} />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
