import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { AGENT_COLORS, AGENT_NAMES, AGENT_IDS } from './types/agent'
import type { AgentId } from './types/agent'
import { V1Page } from '@/pages/v1/V1Page'
import { V2Page } from '@/pages/v2/V2Page'
import { V3Page } from '@/pages/v3/V3Page'
import { V4Page } from '@/pages/v4/V4Page'
import { DebatePage, DebatePage6d4e5d0 } from '@/pages/debate'
import { AgentsPanel } from '@/components/AgentsPanel'
import { ModelSelector, type ModelTier } from '@/components/ModelSelector'
import { RainbowMatrixShader } from '@/components/ui/rainbow-matrix-shader'
import { DotMatrixText } from '@/components/DotMatrixText'

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
}

function HomePage() {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isAgentsPanelOpen, setIsAgentsPanelOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<ModelTier>('pro')
  const [designMode, setDesignMode] = useState<'boxy' | 'round'>('boxy')
  const navigate = useNavigate()

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Navigate to debate page with query and selected model tier
    navigate(`/debate?q=${encodeURIComponent(inputValue.trim())}&model=${selectedTier}`)
  }, [inputValue, navigate, selectedTier])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Rainbow Matrix Shader Background */}
      <RainbowMatrixShader />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40">
        {/* Subtle top line accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="px-6 py-3">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            {/* Left: Design Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">Design:</span>
              <button
                onClick={() => setDesignMode('boxy')}
                className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-all ${
                  designMode === 'boxy'
                    ? 'bg-white text-black'
                    : 'bg-transparent text-white/50 border border-white/20 hover:text-white/70'
                }`}
              >
                Boxy
              </button>
              <button
                onClick={() => setDesignMode('round')}
                className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-all ${
                  designMode === 'round'
                    ? 'bg-white text-black'
                    : 'bg-transparent text-white/50 border border-white/20 hover:text-white/70'
                }`}
              >
                Round
              </button>
            </div>

            {/* Right: GitHub Link */}
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
            {designMode === 'boxy' ? (
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
            ) : (
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 py-8">
                <span className="text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.3)]">
                  Prism
                </span>
              </h1>
            )}
            <p className={`text-base max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 ${
              designMode === 'boxy' ? 'text-white/60 font-mono tracking-wide' : 'text-white/70'
            }`}>
              {designMode === 'boxy' ? (
                <>8 AI PERSPECTIVES ANALYZE YOUR DECISION — <span className="text-white">INSTANTLY</span></>
              ) : (
                <>8 AI perspectives analyze your decision. <span className="text-white font-semibold">Instantly.</span></>
              )}
            </p>
          </div>

          {/* Input Card */}
          <div
            className={`
              p-4 pb-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300
              transition-all duration-200
              ${designMode === 'boxy'
                ? `bg-[#111] border-2 border-white/30 ${isFocused ? 'border-white/60 shadow-[0_0_40px_rgba(255,255,255,0.1)]' : ''}`
                : `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl ${isFocused ? 'border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : ''}`
              }
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
                  className={`
                    flex-1 bg-transparent text-white outline-none text-base py-2
                    disabled:opacity-60
                    ${designMode === 'boxy'
                      ? 'placeholder-white/30 tracking-wide font-mono'
                      : 'placeholder-white/40 font-sans'
                    }
                  `}
                />
              </div>
              
              {/* Bottom bar with icons and submit */}
              <div className={`flex items-center justify-between mt-3 pt-3 ${designMode === 'boxy' ? 'border-t-2 border-white/10' : 'border-t border-white/10'}`}>
                {/* Left side - attach button and model selector */}
                <div className="flex items-center gap-2">
                  {/* Attach button */}
                  <button
                    type="button"
                    className={`w-8 h-8 flex items-center justify-center border text-white/50 hover:text-white transition-all duration-200 ${
                      designMode === 'boxy'
                        ? 'border-white/20 hover:border-white/50 hover:bg-white/10'
                        : 'border-white/10 hover:border-white/30 hover:bg-white/5 rounded-lg'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                  
                  {/* Model Selector */}
                  <ModelSelector
                    selectedTier={selectedTier}
                    onTierChange={setSelectedTier}
                    designMode={designMode}
                  />
                </div>
                
                {/* Right side - agent avatars and submit */}
                <div className="flex items-center gap-3">
                  {/* Agent avatars - clickable to open panel */}
                  <button
                    type="button"
                    onClick={() => setIsAgentsPanelOpen(true)}
                    className="flex items-center -space-x-1 hover:opacity-90 transition-opacity"
                  >
                    {AGENT_IDS.slice(0, 6).map((agent) => {
                      const avatar = AGENT_AVATARS[agent]
                      const color = AGENT_COLORS[agent]
                      const name = AGENT_NAMES[agent]
                      
                      return (
                        <div key={agent} className="group relative">
                          <div
                            className={`
                              w-7 h-7 overflow-hidden
                              transition-all duration-200 cursor-pointer
                              ${designMode === 'boxy'
                                ? 'border border-white/30 hover:z-10 hover:scale-110'
                                : 'border-2 border-black/50 rounded-full hover:z-10 hover:scale-110'
                              }
                            `}
                            style={{ backgroundColor: color }}
                          >
                            <img src={avatar} alt={name} className="w-full h-full" />
                          </div>
                          
                          {/* Tooltip */}
                          <div
                            className={`
                              absolute -top-8 left-1/2 -translate-x-1/2
                              px-2 py-1 text-[10px] font-medium
                              bg-black/80 backdrop-blur-xl border border-white/10 text-white
                              opacity-0 group-hover:opacity-100 transition-opacity
                              whitespace-nowrap pointer-events-none z-20
                              ${designMode === 'round' ? 'rounded-lg' : ''}
                            `}
                          >
                            {name}
                          </div>
                        </div>
                      )
                    })}
                    {/* +2 more indicator */}
                    <div className={`w-7 h-7 flex items-center justify-center bg-white/10 text-[10px] text-white font-medium hover:bg-white/20 transition-colors ${
                      designMode === 'boxy' ? 'border border-white/30' : 'border-2 border-black/50 rounded-full'
                    }`}>
                      +2
                    </div>
                  </button>
                  
                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className={`
                      flex items-center justify-center
                      w-8 h-8
                      transition-all duration-200
                      ${inputValue.trim()
                        ? `bg-white text-black hover:bg-white/90 ${designMode === 'round' ? 'rounded-lg' : ''}`
                        : `bg-white/10 text-white/30 cursor-not-allowed border ${designMode === 'round' ? 'rounded-lg border-white/10' : 'border-white/20'}`
                      }
                    `}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Example prompts */}
          <div className="flex flex-wrap justify-center gap-2 animate-in fade-in duration-700 delay-500">
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
                className={`
                  px-4 py-2 text-sm transition-all duration-200
                  ${designMode === 'boxy'
                    ? 'font-mono tracking-wide bg-[#111] border border-white/20 text-white/60 hover:text-white hover:border-white/50 hover:bg-[#1a1a1a]'
                    : 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/60 hover:text-white hover:border-white/30 hover:bg-white/10'
                  }
                `}
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
            <img
              src="/cerebras-logo.svg"
              alt="Cerebras"
              className="w-6 h-6"
            />
            <span className="text-sm font-mono text-white/70 tracking-wide">
              CEREBRAS
            </span>
          </div>
        </div>
      </footer>

      {/* Agents Panel Modal */}
      <AgentsPanel
        isOpen={isAgentsPanelOpen}
        onClose={() => setIsAgentsPanelOpen(false)}
        designMode={designMode}
      />
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

        {/* Legacy - Commit 6d4e5d0 (WebSocket integration with live streaming) */}
        <Route path="/de" element={<DebatePage6d4e5d0 />} />
        
        {/* V1 - Sidebar layout */}
        <Route path="/v1" element={<V1Page />} />
        
        {/* V2 - Canvas-focused layout */}
        <Route path="/v2" element={<V2Page />} />
        
        {/* V3 - Theatrical premium layout */}
        <Route path="/v3" element={<V3Page />} />
        
        {/* V4 - Linear-inspired clean layout */}
        <Route path="/v4" element={<V4Page />} />
        
        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App