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
import ReactMarkdown from 'react-markdown';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';
import { useDebateStore } from '@/hooks/useDebateStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DebateCanvas } from '@/components/graph';
import { TimelineBar } from '@/components/TimelineBar';

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

  // Design mode toggle (boxy/round)
  const [designMode, setDesignMode] = useState<'boxy' | 'round'>('boxy');

  // State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [constraintInput, setConstraintInput] = useState('');
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);

  // Store
  const agents = useDebateStore((state) => state.agents);
  const phase = useDebateStore((state) => state.phase);
  const isDebating = useDebateStore((state) => state.isDebating);
  const totalTokens = useDebateStore((state) => state.totalTokens);
  const resetDebate = useDebateStore((state) => state.resetDebate);
  const storeQuery = useDebateStore((state) => state.query);

  // WebSocket
  const { isReady, startDebateSession, injectConstraint } = useWebSocket();

  // Timing
  const debateStartTime = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Reset store when query changes (new debate started from home page)
  useEffect(() => {
    if (query && query !== storeQuery) {
      resetDebate();
    }
  }, [query, storeQuery, resetDebate]);

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

  // Calculate tokens per second (PRD: "2,847 t/s" display) - used for display
  const _tokensPerSec = elapsedMs > 0 ? Math.round((totalTokens / elapsedMs) * 1000) : 0;
  void _tokensPerSec; // Used in inspector panel

  // Extract selected agent from node ID (ignore user proxy)
  const selectedAgentId = selectedNodeId && selectedNodeId !== 'node-userproxy'
    ? (selectedNodeId.replace('node-', '') as AgentId)
    : null;

  // Handle node selection from canvas
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    if (nodeId === 'node-userproxy') return;
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
      <header className={`h-14 flex-shrink-0 bg-[#0a0a0a]/90 backdrop-blur-sm z-10 ${designMode === 'boxy' ? 'border-b-2 border-white/10' : 'border-b border-white/[0.06]'}`}>
        <div className="h-full px-5 flex items-center justify-between">
          {/* Left: Logo + Design Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <span className={`text-base font-bold tracking-widest ${designMode === 'boxy' ? 'font-mono' : ''}`}>PRISM</span>
            </button>
            {/* Design Mode Toggle */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setDesignMode('boxy')}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-all ${
                  designMode === 'boxy'
                    ? 'bg-white text-black font-mono'
                    : 'bg-transparent text-white/50 border border-white/20 hover:text-white/70 font-mono'
                }`}
              >
                Boxy
              </button>
              <button
                onClick={() => setDesignMode('round')}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-all ${
                  designMode === 'round'
                    ? 'bg-white text-black rounded'
                    : 'bg-transparent text-white/50 border border-white/20 hover:text-white/70 rounded font-mono'
                }`}
              >
                Round
              </button>
            </div>
          </div>

          {/* Center: Query (truncated) */}
          <div className="flex-1 max-w-xl mx-8 text-center">
            <p className={`truncate ${designMode === 'boxy' ? 'text-xs text-white/50 font-mono' : 'text-xs text-white/50'}`} title={query}>
              "{query}"
            </p>
          </div>

          {/* Right: Empty */}
          <div />
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT - Three Column Layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">
        {/* ─────────────────────────────────────────────────────────────
            LEFT SIDEBAR - Agent Roster
        ───────────────────────────────────────────────────────────── */}
        <aside className={`w-56 flex-shrink-0 bg-[#0a0a0a] flex flex-col ${designMode === 'boxy' ? 'border-r-2 border-white/10' : 'border-r border-white/[0.06]'}`}>
          {/* Header */}
          <div className={`p-3 ${designMode === 'boxy' ? 'border-b-2 border-white/10' : 'border-b border-white/[0.06]'}`}>
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 text-white/40 hover:text-white text-xs uppercase tracking-wider transition-colors px-2 py-2 hover:bg-white/[0.05] w-full ${designMode === 'boxy' ? 'font-mono' : ''}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{designMode === 'boxy' ? 'NEW QUESTION' : 'New Question'}</span>
            </button>
          </div>

          {/* Agent List */}
          <div className="flex-1 p-3 overflow-y-auto">
            <p className={`text-[10px] uppercase tracking-widest text-white/30 mb-3 px-2 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
              {designMode === 'boxy' ? 'AGENTS' : 'Agents'}
            </p>
            <div className="space-y-1">
              {AGENT_IDS.map((agentId) => {
                const isSelected = selectedAgentId === agentId;
                const color = AGENT_COLORS[agentId];
                const agent = agents[agentId];

                return (
                  <button
                    key={agentId}
                    onClick={() => setSelectedNodeId(`node-${agentId}`)}
                    className={`
                      w-full flex items-center gap-3 px-2 py-2 text-left transition-all duration-150
                      ${designMode === 'round' ? 'rounded-lg' : ''}
                      ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}
                    `}
                  >
                    <div
                      className={`w-6 h-6 flex-shrink-0 overflow-hidden ${designMode === 'boxy' ? '' : 'rounded-full'}`}
                      style={{ backgroundColor: color }}
                    >
                      <img
                        src={getAvatarUrl(agentId)}
                        alt={AGENT_NAMES[agentId]}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] text-white/90 truncate ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}>
                        {AGENT_NAMES[agentId]}
                      </p>
                    </div>
                    {agent.isStreaming && (
                      <div
                        className={`w-2 h-2 flex-shrink-0 animate-pulse ${designMode === 'round' ? 'rounded-full' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ─────────────────────────────────────────────────────────────
            CENTER - React Flow Canvas
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 relative">
          <DebateCanvas onNodeSelect={handleNodeSelect} designMode={designMode} />

          {/* Overlay: Waiting state */}
          {phase === 'idle' && !isDebating && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm">
              <div className="text-center space-y-3">
                <div className={`w-8 h-8 border-2 border-white/20 border-t-[#F15A29] animate-spin mx-auto ${designMode === 'round' ? 'rounded-full' : ''}`} />
                <p className={`text-xs text-white/50 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}>
                  {designMode === 'boxy' ? 'CONNECTING TO CEREBRAS' : 'Connecting to Cerebras'}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT SIDEBAR - Inspector (slides in on select)
        ───────────────────────────────────────────────────────────── */}
        {selectedAgentId && agents[selectedAgentId] && (
          <aside className={`${isInspectorExpanded ? 'w-[600px]' : 'w-80'} flex-shrink-0 bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-200 transition-all ${designMode === 'boxy' ? 'border-l-2 border-white/10' : 'border-l border-white/[0.06]'}`}>
            {/* Header */}
            <div className={`h-14 flex-shrink-0 px-4 flex items-center justify-between ${designMode === 'boxy' ? 'border-b-2 border-white/10' : 'border-b border-white/[0.06]'}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 overflow-hidden ${designMode === 'boxy' ? '' : 'rounded-full'}`}
                  style={{ backgroundColor: AGENT_COLORS[selectedAgentId] }}
                >
                  <img
                    src={getAvatarUrl(selectedAgentId)}
                    alt={AGENT_NAMES[selectedAgentId]}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className={`text-xs text-white/80 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : 'font-medium'}`}>
                    {AGENT_NAMES[selectedAgentId]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Expand/Collapse button */}
                <button
                  onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
                  className="text-white/30 hover:text-white/60 p-1.5 transition-colors"
                  title={isInspectorExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isInspectorExpanded ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    )}
                  </svg>
                </button>
                {/* Close button */}
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-white/30 hover:text-white/60 p-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Full Response Only */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 text-[14px] text-white/80 leading-[1.7] break-words">
                {(() => {
                  const { thinking, answer, isThinkingInProgress } = parseThinkTags(agents[selectedAgentId].text);
                  return (
                    <>
                      {/* Thinking Section (collapsible) */}
                      {thinking && (
                        <details className="mb-4 group">
                          <summary className="text-[10px] text-white/30 uppercase tracking-wider mb-2 cursor-pointer hover:text-white/50 transition-colors">
                            💭 Thinking {isThinkingInProgress && <span className="text-yellow-500/60">(in progress)</span>}
                          </summary>
                          <div className="p-3 text-[11px] text-white/40 leading-relaxed bg-white/[0.03] border border-white/[0.06] font-mono max-h-40 overflow-y-auto break-words">
                            {thinking}
                            {isThinkingInProgress && <span className="animate-pulse">▊</span>}
                          </div>
                        </details>
                      )}

                      {/* Response */}
                      <div className="prose prose-invert prose-sm max-w-none break-words">
                        {answer ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0 break-words">{children}</p>,
                              h1: ({ children }) => <h1 className="text-lg font-bold mb-3 text-white/90 break-words">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-white/85 break-words">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-medium mb-2 text-white/80 break-words">{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="text-white/70 break-words">{children}</li>,
                              code: ({ children }) => <code className="bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-white/80 break-all">{children}</code>,
                              pre: ({ children }) => <pre className="bg-white/5 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-white/20 pl-3 italic text-white/50 mb-3 break-words">{children}</blockquote>,
                              strong: ({ children }) => <strong className="text-white/95 font-semibold break-words">{children}</strong>,
                              em: ({ children }) => <em className="text-white/75 italic break-words">{children}</em>,
                            }}
                          >
                            {answer}
                          </ReactMarkdown>
                        ) : (
                          <span className="text-white/40">
                            {isThinkingInProgress ? '(thinking...)' : (agents[selectedAgentId].isStreaming ? '' : 'Waiting...')}
                          </span>
                        )}
                        {agents[selectedAgentId].isStreaming && !isThinkingInProgress && <span className="animate-pulse">▊</span>}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM SECTION - Input + Timeline
      ═══════════════════════════════════════════════════════════════ */}
      
      {/* Follow-up Input Bar - Compact */}
      <div className="flex-shrink-0">
        <div className="flex">
          <div className={`w-56 flex-shrink-0 bg-[#0a0a0a] ${designMode === 'boxy' ? 'border-r-2 border-white/10' : 'border-r border-white/[0.06]'}`} />
          <div className="flex-1 bg-[#0a0a0a] px-5 py-2.5">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleConstraintSubmit}>
                <div className={`flex items-center gap-2 h-10 px-3 transition-all duration-200 ${
                  designMode === 'boxy'
                    ? 'bg-[#0f0f0f] border border-white/[0.08]'
                    : 'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-lg'
                }`}>
                  <input
                    type="text"
                    value={constraintInput}
                    onChange={(e) => setConstraintInput(e.target.value)}
                    placeholder={designMode === 'boxy' ? 'ADD A CONSTRAINT...' : 'Add a constraint...'}
                    className={`flex-1 bg-transparent text-white outline-none text-sm ${
                      designMode === 'boxy'
                        ? 'placeholder-white/30 tracking-wide font-mono text-xs'
                        : 'placeholder-white/40 font-sans'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!constraintInput.trim()}
                    className={`flex items-center justify-center w-7 h-7 flex-shrink-0 transition-all duration-200 ${
                      constraintInput.trim()
                        ? `bg-white text-black hover:bg-white/90 ${designMode === 'round' ? 'rounded-lg' : ''}`
                        : `bg-white/10 text-white/30 cursor-not-allowed border ${designMode === 'round' ? 'rounded-lg border-white/10' : 'border-white/20'}`
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Bar */}
      <div className="flex-shrink-0">
        <div className="flex">
          <div className={`w-56 flex-shrink-0 bg-[#0a0a0a] ${designMode === 'boxy' ? 'border-r-2 border-white/10' : 'border-r border-white/[0.06]'}`} />
          <div className="flex-1">
            <TimelineBar elapsedMs={elapsedMs} designMode={designMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
