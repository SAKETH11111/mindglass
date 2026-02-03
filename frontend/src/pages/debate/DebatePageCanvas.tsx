/**
 * DebatePage - React Flow Canvas-based Multi-Agent Debate Visualization
 * 
 * Layout:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  TOP BAR - Query, Status, Token Counter                         │
 * ├──────────┬───────────────────────────────────────┬───────────────┤
 * │  LEFT    │          REACT FLOW CANVAS            │    RIGHT      │
 * │ SIDEBAR  │     (Force-directed graph with        │  INSPECTOR    │
 * │  Agent   │      semantic edges)                  │  (on select)  │
 * │ Roster   │                                       │               │
 * ├──────────┴───────────────────────────────────────┴───────────────┤
 * │  BOTTOM BAR - Timeline, Interrupt Input, Cerebras Branding      │
 * └──────────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';
import { useDebateStore } from '@/hooks/useDebateStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DebateCanvas } from '@/components/graph';

// DiceBear avatar
const getAvatarUrl = (agentId: AgentId) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${agentId}&backgroundColor=transparent`;

// Parse think tags for inspector display
const parseThinkTags = (text: string): { thinking: string; answer: string; isThinkingInProgress: boolean } => {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      answer: text.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
      isThinkingInProgress: false,
    };
  }
  // Handle incomplete think tag (still streaming)
  const openThinkMatch = text.match(/<think>([\s\S]*)/);
  if (openThinkMatch && !text.includes('</think>')) {
    return { thinking: openThinkMatch[1].trim(), answer: '', isThinkingInProgress: true };
  }
  return { thinking: '', answer: text, isThinkingInProgress: false };
};

export function DebatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const modelTier = searchParams.get('model') || 'pro';

  // State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [constraintInput, setConstraintInput] = useState('');

  // Store
  const agents = useDebateStore((state) => state.agents);
  const phase = useDebateStore((state) => state.phase);
  const isDebating = useDebateStore((state) => state.isDebating);
  const connectionState = useDebateStore((state) => state.connectionState);
  const totalTokens = useDebateStore((state) => state.totalTokens);

  // WebSocket
  const { isReady, startDebateSession, injectConstraint } = useWebSocket();

  // Timing
  const debateStartTime = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Start debate on mount
  useEffect(() => {
    if (isReady && query && !isDebating && phase === 'idle') {
      debateStartTime.current = Date.now();
      startDebateSession(query, modelTier);
    }
  }, [isReady, query, modelTier, isDebating, phase, startDebateSession]);

  // Update elapsed time
  useEffect(() => {
    if (!isDebating || !debateStartTime.current) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - (debateStartTime.current || Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, [isDebating]);

  // Format time
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate tokens per second (PRD: "2,847 t/s" display)
  const tokensPerSec = elapsedMs > 0 ? Math.round((totalTokens / elapsedMs) * 1000) : 0;

  // Extract selected agent from node ID
  const selectedAgentId = selectedNodeId
    ? (selectedNodeId.replace('node-', '') as AgentId)
    : null;

  // Handle node selection from canvas
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Handle constraint submit (interrupt feature)
  const handleConstraintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!constraintInput.trim()) return;
    // Send constraint to backend via WebSocket (PRD: Interrupt & Inject)
    injectConstraint(constraintInput.trim());
    setConstraintInput('');
  };

  // Timeline progress (12 second max)
  const timelineProgress = Math.min((elapsedMs / 12000) * 100, 100);

  // No query state
  if (!query) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/60 font-mono text-sm">NO QUESTION PROVIDED</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#111] border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition-colors font-mono text-sm"
          >
            GO BACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0a] text-white flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════
          TOP BAR
      ═══════════════════════════════════════════════════════════════ */}
      <header className="h-14 flex-shrink-0 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-sm z-10">
        <div className="h-full px-5 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <span className="text-base font-bold tracking-widest font-mono">PRISM</span>
          </button>

          {/* Center: Query (truncated) */}
          <div className="flex-1 max-w-xl mx-8 text-center">
            <p className="text-xs text-white/50 truncate" title={query}>
              "{query}"
            </p>
          </div>

          {/* Right: Status + Metrics */}
          <div className="flex items-center gap-4">
            {/* Phase/Round Name */}
            {phase !== 'idle' && phase !== 'complete' && (
              <span className="text-[10px] text-[#F15A29] uppercase tracking-wider font-mono font-bold">
                {phase}
              </span>
            )}
            {phase === 'complete' && (
              <span className="text-[10px] text-emerald-500 uppercase tracking-wider font-mono font-bold">
                DEBATE COMPLETE
              </span>
            )}

            {/* Token Counter - PRD: "2,847 t/s" */}
            {totalTokens > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#F15A29] font-mono tabular-nums font-bold">
                  {tokensPerSec.toLocaleString()} t/s
                </span>
                <span className="text-[10px] text-white/30 font-mono tabular-nums">
                  ({totalTokens.toLocaleString()} tok)
                </span>
              </div>
            )}

            {/* Connection */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-emerald-500'
                    : connectionState === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : connectionState === 'error'
                    ? 'bg-red-500'
                    : 'bg-white/30'
                }`}
              />
              <span className="text-[10px] text-white/30 font-mono uppercase">
                {connectionState === 'connected'
                  ? 'LIVE'
                  : connectionState === 'connecting'
                  ? 'CONN'
                  : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT - Three Column Layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">
        {/* ─────────────────────────────────────────────────────────────
            LEFT SIDEBAR - Agent Roster
        ───────────────────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-white/[0.06]">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/40 hover:text-white text-xs uppercase tracking-wider transition-colors px-2 py-2 hover:bg-white/[0.05] w-full font-mono"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>NEW QUESTION</span>
            </button>
          </div>

          {/* Agent List */}
          <div className="flex-1 p-3 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3 px-2 font-mono">
              AGENTS
            </p>
            <div className="space-y-1">
              {AGENT_IDS.map((agentId) => {
                const isSelected = selectedAgentId === agentId;
                const color = AGENT_COLORS[agentId];
                const agent = agents[agentId];
                const status = agent.isStreaming
                  ? 'STREAMING'
                  : agent.text
                  ? 'COMPLETE'
                  : 'WAITING';

                return (
                  <button
                    key={agentId}
                    onClick={() => setSelectedNodeId(`node-${agentId}`)}
                    className={`
                      w-full flex items-center gap-3 px-2 py-2 text-left transition-all duration-150
                      ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}
                    `}
                  >
                    <div
                      className="w-6 h-6 flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: color }}
                    >
                      <img
                        src={getAvatarUrl(agentId)}
                        alt={AGENT_NAMES[agentId]}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/90 truncate font-mono uppercase tracking-wider">
                        {AGENT_NAMES[agentId]}
                      </p>
                      <p className="text-[9px] text-white/30 truncate font-mono">{status}</p>
                    </div>
                    {agent.isStreaming && (
                      <div
                        className="w-2 h-2 flex-shrink-0 animate-pulse"
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="text-[10px] text-white/25 font-mono px-2">
              {AGENT_IDS.filter((id) => agents[id].isStreaming).length > 0
                ? `${AGENT_IDS.filter((id) => agents[id].isStreaming).length} STREAMING`
                : `${AGENT_IDS.filter((id) => agents[id].text).length}/8 COMPLETE`}
            </div>
          </div>
        </aside>

        {/* ─────────────────────────────────────────────────────────────
            CENTER - React Flow Canvas
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 relative">
          <DebateCanvas onNodeSelect={handleNodeSelect} />

          {/* Overlay: Waiting state */}
          {phase === 'idle' && !isDebating && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-[#F15A29] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-white/50 font-mono uppercase tracking-wider">
                  CONNECTING TO CEREBRAS
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT SIDEBAR - Inspector (slides in on select)
        ───────────────────────────────────────────────────────────── */}
        {selectedAgentId && (
          <aside className="w-80 flex-shrink-0 bg-[#0a0a0a] border-l border-white/[0.06] flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="h-14 flex-shrink-0 px-4 flex items-center justify-between border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 overflow-hidden"
                  style={{ backgroundColor: AGENT_COLORS[selectedAgentId] }}
                >
                  <img
                    src={getAvatarUrl(selectedAgentId)}
                    alt={AGENT_NAMES[selectedAgentId]}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className="text-xs text-white/80 font-mono uppercase tracking-wider">
                    {AGENT_NAMES[selectedAgentId]}
                  </p>
                  <p className="text-[10px] text-white/30 font-mono">INSPECTOR</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-white/30 hover:text-white/60 p-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Thinking Section */}
              {(() => {
                const { thinking, answer, isThinkingInProgress } = parseThinkTags(agents[selectedAgentId].text);
                return (
                  <>
                    {thinking && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 font-mono">
                          💭 THINKING {isThinkingInProgress && <span className="text-yellow-500/60">(in progress)</span>}
                        </p>
                        <div className="p-3 text-[11px] text-white/40 leading-relaxed bg-[#0f0f0f] border border-white/[0.06] font-mono max-h-40 overflow-y-auto">
                          {thinking}
                          {isThinkingInProgress && <span className="animate-pulse">▊</span>}
                        </div>
                      </div>
                    )}

                    {/* Response */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 font-mono">
                        RESPONSE
                      </p>
                      <div className="p-4 text-[12px] text-white/60 leading-relaxed bg-[#0f0f0f] border border-white/[0.06] font-mono min-h-[120px] max-h-[300px] overflow-y-auto">
                        {answer || (isThinkingInProgress ? '(thinking...)' : (agents[selectedAgentId].isStreaming ? '' : 'Waiting...'))}
                        {agents[selectedAgentId].isStreaming && !isThinkingInProgress && <span className="animate-pulse">▊</span>}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Metadata */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 font-mono">
                  METADATA
                </p>
                <div className="p-3 space-y-2 text-[10px] bg-[#0f0f0f] border border-white/[0.06] font-mono">
                  <div className="flex justify-between">
                    <span className="text-white/40">TOKENS</span>
                    <span className="text-white/60">{agents[selectedAgentId].tokenCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">TOK/SEC</span>
                    <span className="text-[#F15A29] font-bold">
                      {agents[selectedAgentId].tokensPerSecond > 0 
                        ? `${agents[selectedAgentId].tokensPerSecond.toLocaleString()} t/s`
                        : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">STATUS</span>
                    <span className="text-white/60">
                      {agents[selectedAgentId].isStreaming
                        ? 'STREAMING'
                        : agents[selectedAgentId].text
                        ? 'COMPLETE'
                        : 'WAITING'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">PHASE</span>
                    <span className="text-white/60">{agents[selectedAgentId].phase || phase}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM BAR - Timeline + Interrupt Input + Branding
      ═══════════════════════════════════════════════════════════════ */}
      <footer className="h-14 flex-shrink-0 bg-[#0a0a0a] border-t border-white/[0.06] px-5 flex items-center gap-4">
        {/* Timeline */}
        <div className="flex items-center gap-3 w-48">
          <span className="text-[10px] text-white/25 tabular-nums font-mono w-8">
            {formatTime(elapsedMs)}
          </span>
          <div className="flex-1 h-1 bg-white/[0.06] relative">
            <div
              className="absolute left-0 top-0 h-full bg-[#F15A29]/60 transition-all duration-100"
              style={{ width: `${timelineProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-white/25 tabular-nums font-mono w-8">0:12</span>
        </div>

        {/* Interrupt Input (PRD Feature: User steering) */}
        <form onSubmit={handleConstraintSubmit} className="flex-1 max-w-lg">
          <div className="flex items-center gap-2 h-9 px-3 bg-white/[0.03] border border-white/[0.08] focus-within:border-[#F15A29]/40 transition-colors">
            <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <input
              type="text"
              value={constraintInput}
              onChange={(e) => setConstraintInput(e.target.value)}
              placeholder="Add constraint... (e.g., 'Budget is $5k')"
              className="flex-1 bg-transparent text-white/70 placeholder-white/25 text-xs font-mono outline-none"
            />
            {constraintInput && (
              <button
                type="submit"
                className="text-[10px] text-[#F15A29] font-mono uppercase tracking-wider hover:text-[#F15A29]/80 transition-colors"
              >
                INJECT
              </button>
            )}
          </div>
        </form>

        {/* Cerebras Branding */}
        <div className="flex items-center gap-2 ml-auto">
          <img src="/cerebras-logo.svg" alt="Cerebras" className="w-4 h-4 opacity-50" />
          <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
            Cerebras
          </span>
        </div>
      </footer>
    </div>
  );
}
