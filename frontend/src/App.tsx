import { useState, useCallback, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Send, Clock } from 'lucide-react'
import { AGENT_COLORS, AGENT_NAMES } from './types/agent'
import type { AgentId } from './types/agent'
import { DebatePage } from '@/pages/debate'
import { HistorySidebar } from '@/components/HistorySidebar'
import { AgentManagerWindow } from '@/components/AgentManagerWindow'
import { ModelSelector, type ModelTier } from '@/components/ModelSelector'
import { RainbowMatrixShader } from '@/components/ui/rainbow-matrix-shader'
import { DotMatrixText } from '@/components/DotMatrixText'
import { useSessionStore } from '@/hooks/useSessionStore'
import { useDebateStore } from '@/hooks/useDebateStore'

// DiceBear Notionists avatar URLs for each agent
const AGENT_AVATARS: Record<AgentId, string> = {
  analyst: 'https://api.dicebear.com/7.x/notionists/svg?seed=analyst&backgroundColor=transparent',
  optimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=sunny&backgroundColor=transparent',
  pessimist: 'https://api.dicebear.com/7.x/notionists/svg?seed=cloudy&backgroundColor=transparent',
  critic: 'https://api.dicebear.com/7.x/notionists/svg?seed=critic&backgroundColor=transparent',
  strategist: 'https://api.dicebear.com/7.x/notionists/svg?seed=planner&backgroundColor=transparent',
  finance: 'https://api.dicebear.com/7.x/notionists/svg?seed=banker&backgroundColor=transparent',
  risk: 'https://api.dicebear.com/7.x/notionists/svg?seed=guardian&backgroundColor=transparent',
  synthesizer: 'https://api.dicebear.com/7.x/notionists/svg?seed=leader&backgroundColor=transparent',
}

function HomePage() {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [selectedTier, setSelectedTier] = useState<ModelTier>('fast')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAgentWindowOpen, setIsAgentWindowOpen] = useState(false)
  const agentAvatarsRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // Session management
  const {
    selectedAgents,
    sessionHistory,
    createSession,
    loadSession,
    loadAllSessions,
  } = useSessionStore()

  // Load sessions on mount
  useEffect(() => {
    loadAllSessions()
  }, [loadAllSessions])

  // Debate store reset function
  const resetDebate = useDebateStore((state) => state.resetDebate)

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Reset previous debate state before starting new one
    resetDebate()

    // Create a new session with the selected agents
    createSession(inputValue.trim(), selectedAgents, selectedTier)

    // Navigate to debate page with query and selected model tier
    // Always include agents param to ensure correct selection
    const agentsParam = `&agents=${selectedAgents.join(',')}`
    navigate(`/debate?q=${encodeURIComponent(inputValue.trim())}&model=${selectedTier}${agentsParam}`)
  }, [inputValue, navigate, selectedTier, selectedAgents, createSession, resetDebate])

  const handleSelectSession = useCallback((sessionId: string) => {
    const session = loadSession(sessionId)
    if (session) {
      // Navigate to the session - use last turn's query if available, otherwise use title
      const query = session.turns.length > 0 
        ? session.turns[session.turns.length - 1].query 
        : session.title;
      // Always include agents param to ensure correct selection
      const agentsParam = `&agents=${session.selectedAgents.join(',')}`
      console.log('[App] Loading session:', sessionId, 'query:', query, 'agents:', session.selectedAgents);
      navigate(`/debate?q=${encodeURIComponent(query)}&model=${session.modelTier}${agentsParam}&session=${sessionId}`)
    } else {
      console.error('[App] Failed to load session:', sessionId);
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
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            {/* Left - Empty for balance */}
            <div />

            {/* Right - GitHub Link */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-7 h-7 text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
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
              Get instant, multi-angle analysis on any decision
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
                  placeholder="What decision do you need help with?"
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
                  {/* Attach button */}
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center border text-white/50 hover:text-white transition-all duration-200 border-white/20 hover:border-white/50 hover:bg-white/10"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>

                  {/* Model Selector */}
                  <ModelSelector
                    selectedTier={selectedTier}
                    onTierChange={setSelectedTier}
                  />
                </div>

                {/* Right side - agent avatars (clickable selector) and submit */}
                <div className="flex items-center gap-3 relative">
                  {/* Agent avatars - clickable to open window */}
                  <button
                    ref={agentAvatarsRef}
                    type="button"
                    onClick={() => setIsAgentWindowOpen(true)}
                    className="flex items-center -space-x-0.5 hover:opacity-90 transition-opacity group"
                    title="Manage consultants"
                  >
                    {selectedAgents.slice(0, 4).map((agent) => {
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
                  />

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
              <span>VIEW HISTORY</span>
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
              "Is remote work better for productivity?",
              "Should my startup focus on growth or profit?",
              "Should I buy Tesla stock right now?",
              "Is it time to hire or automate?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInputValue(prompt)}
                className="text-left px-3 py-2.5 text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors bg-[#111] border border-white/10 hover:border-white/30"
              >
                {prompt}
              </button>
            ))}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-center">
          <div className="flex items-center gap-3 group cursor-default">
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Powered by</span>
            <img
              src="/cerebras-logo-white.png"
              alt="Cerebras"
              className="h-7 w-auto opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </footer>

    </div>
  )
}

// Main App with Router
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root - Home page */}
        <Route path="/" element={<HomePage />} />

        {/* Debate Canvas - Main experience */}
        <Route path="/debate" element={<DebatePage />} />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
