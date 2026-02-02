import { useState, useCallback } from 'react'
import { Send, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { useWebSocket } from './hooks/useWebSocket'
import { useDebateStore } from './hooks/useDebateStore'
import type { StartDebateMessage } from './types/websocket'
import { AGENT_COLORS, AGENT_NAMES } from './types/agent'
import type { AgentId } from './types/agent'

// Cerebras Logo Component using official SVG
function CerebrasLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <img
      src="/cerebras-logo.svg"
      alt="Cerebras"
      className={className}
    />
  )
}

// Animated ring decoration
function RingDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Outer ring */}
      <div className="absolute -top-40 -right-40 w-80 h-80 opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: '60s' }}>
          <circle cx="50" cy="50" r="48" stroke="#F15A29" strokeWidth="0.5" fill="none" strokeDasharray="4 4" />
        </svg>
      </div>
      {/* Middle ring */}
      <div className="absolute -top-32 -right-32 w-64 h-64 opacity-15">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: '45s', animationDirection: 'reverse' }}>
          <circle cx="50" cy="50" r="45" stroke="#F15A29" strokeWidth="0.5" fill="none" strokeDasharray="8 8" />
        </svg>
      </div>
      {/* Inner ring */}
      <div className="absolute -top-24 -right-24 w-48 h-48 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: '30s' }}>
          <circle cx="50" cy="50" r="40" stroke="#FF985D" strokeWidth="0.5" fill="none" strokeDasharray="12 12" />
        </svg>
      </div>
    </div>
  )
}

// Status indicator component
function StatusIndicator({ status = "ready" }: { status?: "ready" | "thinking" | "streaming" | "connecting" | "error" }) {
  const statusConfig = {
    ready: { color: "bg-[#92E849]", text: "Ready", pulse: false },
    connecting: { color: "bg-[#FF985D]", text: "Connecting", pulse: true },
    thinking: { color: "bg-[#FF985D]", text: "Thinking", pulse: true },
    streaming: { color: "bg-[#F15A29]", text: "Streaming", pulse: true },
    error: { color: "bg-red-500", text: "Error", pulse: false },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#262626] border border-[#333333]">
      <span className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-[#B0B0B0] uppercase tracking-wider">{config.text}</span>
    </div>
  )
}

function App() {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const { sendMessage, isReady } = useWebSocket()
  const { agentText, isStreaming, currentAgentId, clearResponse, error } = useDebateStore()

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !isReady) return

    // Clear previous response
    clearResponse()

    // Send start_debate message
    const message: StartDebateMessage = {
      type: 'start_debate',
      query: inputValue.trim(),
    }

    const sent = sendMessage(message)
    if (sent) {
      setInputValue("")
    }
  }, [inputValue, isReady, sendMessage, clearResponse])

  // Get status for indicator
  const getStatus = () => {
    if (error) return "error"
    if (isStreaming) return "streaming"
    if (!isReady) return "connecting"
    return "ready"
  }

  // Use centralized agent color constants
  const agentId = (currentAgentId as AgentId) || 'analyst'
  const agentName = AGENT_NAMES[agentId] || 'Analyst'
  const agentColor = AGENT_COLORS[agentId] || '#4ECDC4'

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white relative overflow-hidden">
      {/* Wafer grid background pattern */}
      <div className="absolute inset-0 wafer-grid opacity-50" />

      {/* Ring decorations */}
      <RingDecoration />

      {/* Top border line - Cerebras style */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#F15A29] z-50" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CerebrasLogo className="w-10 h-10" />
            <span className="text-sm font-semibold tracking-wider text-[#808080] uppercase hidden sm:block">
              Cerebras
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/cerebras"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#808080] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-24">
        <div className="w-full max-w-2xl space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <CerebrasLogo className="w-20 h-20" />
                {/* Glow effect behind logo */}
                <div className="absolute inset-0 blur-3xl bg-[#F15A29] opacity-20 -z-10" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="gradient-text">MindGlass</span>
            </h1>
            <p className="text-lg text-[#B0B0B0] max-w-md mx-auto">
              Multi-Agent Debate Interface powered by{' '}
              <span className="text-[#F15A29] font-semibold">Cerebras</span>
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Input Card - Die-cut tile style */}
          <div className="die-cut-tile p-1">
            <form onSubmit={handleSubmit}>
              <div
                className={`
                  flex items-center gap-3 p-4 rounded
                  bg-[#1A1A1A] border transition-all duration-200
                  ${isFocused
                    ? 'border-[#F15A29] shadow-[0_0_0_1px_rgba(241,90,41,1)]'
                    : 'border-[#333333] hover:border-[#4D4D4D]'
                  }
                `}
              >
                {!isReady ? (
                  <Loader2 className="w-5 h-5 text-[#808080] animate-spin" />
                ) : (
                  <Sparkles className={`w-5 h-5 transition-colors ${isFocused ? 'text-[#F15A29]' : 'text-[#808080]'}`} />
                )}
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={!isReady ? "Connecting..." : isStreaming ? "Agent is responding..." : "Enter your question..."}
                  disabled={!isReady || isStreaming}
                  className="
                    flex-1 bg-transparent text-white placeholder-[#808080]
                    outline-none text-base
                    font-sans
                    disabled:opacity-60
                  "
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || !isReady || isStreaming}
                  className={`
                    flex items-center justify-center
                    w-10 h-10 rounded
                    transition-all duration-200
                    ${inputValue.trim() && isReady && !isStreaming
                      ? 'bg-[#F15A29] text-black hover:bg-[#FF985D] hover:shadow-[0_0_20px_rgba(241,90,41,0.4)]'
                      : 'bg-[#333333] text-[#808080] cursor-not-allowed'
                    }
                  `}
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Agent Response */}
          {(currentAgentId || agentText) && (
            <div className="die-cut-tile p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Agent header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: agentColor }}
                />
                <span
                  className="font-semibold text-sm uppercase tracking-wider"
                  style={{ color: agentColor }}
                >
                  {agentName}
                </span>
                {isStreaming && (
                  <span className="text-[#808080] text-xs animate-pulse">
                    typing...
                  </span>
                )}
              </div>

              {/* Response container */}
              <div className="max-h-[300px] overflow-y-auto pr-2">
                <p className="text-white leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {agentText}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-[#F15A29] ml-1 animate-pulse" />
                  )}
                </p>
              </div>

              {/* Token count */}
              {agentText.length > 0 && (
                <div className="flex justify-end pt-2 border-t border-[#333333]">
                  <span className="text-[#808080] text-xs">
                    {agentText.length} characters
                    {isStreaming && ' • streaming'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: "8 Agents", color: "#A876E8" },
              { label: "Real-time", color: "#92E849" },
              { label: "Cerebras Inference", color: "#F15A29" },
            ].map((feature) => (
              <span
                key={feature.label}
                className="px-3 py-1 rounded text-xs font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: `${feature.color}15`,
                  color: feature.color,
                  border: `1px solid ${feature.color}30`,
                }}
              >
                {feature.label}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#808080]">
            <span className="font-mono">Powered by</span>
            <span className="text-[#F15A29] font-semibold">Cerebras</span>
          </div>
          <StatusIndicator status={getStatus()} />
        </div>
      </footer>

      {/* Corner decorations - Die-cut style */}
      <div className="fixed bottom-0 left-0 w-[14px] h-[14px] z-50">
        <div className="absolute w-full h-[7px] overflow-hidden">
          <div className="rounded-full w-[14px] h-[14px] bg-[#1A1A1A]" />
        </div>
      </div>
      <div className="fixed bottom-0 right-0 w-[14px] h-[14px] z-50">
        <div className="absolute w-full h-[7px] overflow-hidden right-0">
          <div className="rounded-full w-[14px] h-[14px] bg-[#1A1A1A] translate-x-1/2" />
        </div>
      </div>
    </div>
  )
}

export default App