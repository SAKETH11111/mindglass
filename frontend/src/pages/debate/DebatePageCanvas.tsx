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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Clock } from 'lucide-react';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId, getAgentIdsForIndustry } from '@/types/agent';
import { useDebateStore } from '@/hooks/useDebateStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DebateCanvas } from '@/components/graph';
import { TimelineBar } from '@/components/TimelineBar';
import { useSessionStore } from '@/hooks/useSessionStore';
import { SessionHistoryPanel } from '@/components/SessionHistoryPanel';

// DiceBear avatar
const getAvatarUrl = (agentId: string) => {
  // Use 'leader' seed for synthesizer for a more professional/confident look
  const seed = agentId === 'synthesizer' ? 'leader' : agentId;
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=transparent`;
};

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
  const agentsParam = searchParams.get('agents');
  const sessionIdParam = searchParams.get('session');
  const industryParam = searchParams.get('industry') || '';

  // State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const hasStartedRef = useRef(false);
  const hasAutoOpenedSynth = useRef(false);

  // Parse selected agents from URL (accepts any valid agent IDs)
  const agentsFromUrl = agentsParam
    ? agentsParam.split(',').filter(a => a.length > 0) as AgentId[]
    : null;

  // Store
  const agents = useDebateStore((state) => state.agents);
  const phase = useDebateStore((state) => state.phase);
  const isDebating = useDebateStore((state) => state.isDebating);
  const totalTokens = useDebateStore((state) => state.totalTokens);
  const resetDebate = useDebateStore((state) => state.resetDebate);

  const synthesizerText = agents.synthesizer?.text || '';
  const synthesizerStreaming = agents.synthesizer?.isStreaming || false;
  
  // Follow-up conversation actions
  const saveCurrentTurn = useDebateStore((state) => state.saveCurrentTurn);
  const addFollowUpQuestion = useDebateStore((state) => state.addFollowUpQuestion);
  const startFollowUpDebate = useDebateStore((state) => state.startFollowUpDebate);

  // Session store
  const {
    getPreviousTurnsContext,
    startNewTurn,
    completeTurn,
    updateTurnResponse,
    loadSession,
    setSelectedAgents,
    selectedAgents: storeSelectedAgents,
  } = useSessionStore();

  const selectedAgentsFromUrl = agentsFromUrl || storeSelectedAgents;

  // Get industry-specific agent IDs
  const industryAgentIds = useMemo<AgentId[]>(() => {
    return getAgentIdsForIndustry(industryParam || undefined);
  }, [industryParam]);

  const effectiveSelectedAgents = useMemo<AgentId[]>(() => {
    // If industry is set, use industry-specific agents
    if (industryParam && industryParam !== 'any') {
      return industryAgentIds;
    }
    // Otherwise use selected agents from URL or store
    const base: AgentId[] = (selectedAgentsFromUrl && selectedAgentsFromUrl.length > 0)
      ? selectedAgentsFromUrl
      : AGENT_IDS;
    return base.includes('synthesizer') ? base : [...base, 'synthesizer'];
  }, [selectedAgentsFromUrl, industryParam, industryAgentIds]);

  // Visible agents are the ones we should display in the UI
  const visibleAgents = useMemo<AgentId[]>(() => {
    return effectiveSelectedAgents;
  }, [effectiveSelectedAgents]);

  // WebSocket
  const { isReady, startDebateSession, startFollowUpSession, injectConstraint } = useWebSocket({ autoConnect: true });

  // Constraint input state
  const [constraintInput, setConstraintInput] = useState('');

  // Timing
  const debateStartTime = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Initialize selected agents from URL if provided (only once)
  const hasInitializedAgents = useRef(false);
  useEffect(() => {
    if (!hasInitializedAgents.current && agentsFromUrl && agentsFromUrl.length > 0) {
      hasInitializedAgents.current = true;
      setSelectedAgents(agentsFromUrl);
    }
  }, []); // Empty dependency array - run once on mount

  // Reset auto-open state for each new debate
  useEffect(() => {
    if (isDebating) {
      hasAutoOpenedSynth.current = false;
    }
  }, [isDebating, query]);

  // Auto-open synthesizer inspector when final output is ready
  useEffect(() => {
    if (!isDebating || hasAutoOpenedSynth.current) return;
    if (synthesizerText && !synthesizerStreaming) {
      hasAutoOpenedSynth.current = true;
      setSelectedNodeId('node-synthesizer');
      setIsInspectorExpanded(true);
    }
  }, [isDebating, synthesizerText, synthesizerStreaming]);

  // Load session if resuming
  useEffect(() => {
    if (sessionIdParam) {
      loadSession(sessionIdParam);
    }
  }, [sessionIdParam, loadSession]);

  // Reset store when URL query changes from home page navigation (not follow-ups)
  const lastUrlQueryRef = useRef<string>(query || '');
  useEffect(() => {
    // Only reset if the URL query itself changed (new debate from home page)
    // NOT if the store query changed (which happens during follow-ups)
    if (query && query !== lastUrlQueryRef.current) {
      console.log('[DebatePageCanvas] URL query changed, resetting debate');
      lastUrlQueryRef.current = query;
      resetDebate();
      hasStartedRef.current = false;
      setShowFollowUp(false);
      setFollowUpInput('');
      setSelectedNodeId(null);
    }
  }, [query, resetDebate]);

  // Start debate on mount
  useEffect(() => {
    if (query && !isDebating && phase === 'idle' && !hasStartedRef.current) {
      hasStartedRef.current = true;
      debateStartTime.current = Date.now();

      // Initialize agents if not already done (avoid double-setting)
      if (!hasInitializedAgents.current && agentsFromUrl && agentsFromUrl.length > 0) {
        hasInitializedAgents.current = true;
        setSelectedAgents(agentsFromUrl);
      }

      const previousContext = getPreviousTurnsContext();
      startNewTurn(query);
      startDebateSession(query, modelTier, previousContext, effectiveSelectedAgents, industryParam);
    }
  }, [query, modelTier, isDebating, phase, startDebateSession, getPreviousTurnsContext, startNewTurn, effectiveSelectedAgents, agentsFromUrl, setSelectedAgents, industryParam]);

  // Mark turn complete when debate ends
  useEffect(() => {
    if (phase === 'complete' && !isDebating) {
      completeTurn();
      setShowFollowUp(true);
    }
  }, [phase, isDebating, completeTurn]);

  // Sync agent responses to session store (throttled to prevent infinite loops)
  const lastSyncedResponses = useRef<Record<string, string>>({});
  useEffect(() => {
    effectiveSelectedAgents.forEach(agentId => {
      const agent = agents[agentId];
      // Only update if agent exists, text exists, and has actually changed from last sync
      if (agent?.text && agent.text !== lastSyncedResponses.current[agentId]) {
        lastSyncedResponses.current[agentId] = agent.text;
        updateTurnResponse(agentId, agent.text);
      }
    });
  }, [agents, updateTurnResponse, effectiveSelectedAgents]);

  // Update elapsed time
  useEffect(() => {
    if (!isDebating || !debateStartTime.current) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - (debateStartTime.current || Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, [isDebating]);

  // NOTE: Aggregate TPS is derived from real agent metrics in the store
  // const currentTps = useMemo(() => {
  //   const agentTps = effectiveSelectedAgents.map(id => agents[id]?.tokensPerSecond || 0);
  //   return Math.max(...agentTps, 0);
  // }, [agents, effectiveSelectedAgents]);

  // Legacy calculation for compatibility
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

  // Handle constraint submit (interrupt feature) - TODO: wire up to UI
  const handleConstraintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!constraintInput.trim()) return;
    // Send constraint to backend via WebSocket (PRD: Interrupt & Inject)
    injectConstraint(constraintInput.trim());
    setConstraintInput('');
  };
  void handleConstraintSubmit; // Will be wired to constraint input UI

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || !isReady) return;

    const newQuery = followUpInput.trim();
    setFollowUpInput('');
    setShowFollowUp(false);

    // 1. Save the current turn as completed
    saveCurrentTurn();
    
    // 2. Add the follow-up question as a "YOU" node
    addFollowUpQuestion(newQuery);
    
    // 3. Start a new debate round for the follow-up (in-place, no navigation)
    startFollowUpDebate(newQuery);
    
    // 4. Mark that we've started so the main effect doesn't double-trigger
    hasStartedRef.current = true;
    debateStartTime.current = Date.now();
    
    // 5. Start a new turn in the session store
    startNewTurn(newQuery);
    
    // 6. Build context from previous turns and start the WebSocket debate
    // Use startFollowUpSession which does NOT reset the store
    const previousContext = getPreviousTurnsContext();
    startFollowUpSession(newQuery, modelTier, previousContext, effectiveSelectedAgents);
  };

  const handleSelectSession = useCallback((sessionId: string) => {
    const session = loadSession(sessionId);
    if (session) {
      const lastQuery = session.turns.length > 0
        ? session.turns[session.turns.length - 1].query
        : session.title;
      const agentsParamOut = `&agents=${session.selectedAgents.join(',')}`;
      navigate(`/debate?q=${encodeURIComponent(lastQuery)}&model=${session.modelTier}${agentsParamOut}&session=${sessionId}`);
    }
  }, [loadSession, navigate]);

  const handleNewSession = useCallback(() => {
    navigate('/');
  }, [navigate]);

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
      <SessionHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        designMode="boxy"
      />
      {/* ═══════════════════════════════════════════════════════════════
          TOP BAR
      ═══════════════════════════════════════════════════════════════ */}
      <header className="h-14 flex-shrink-0 bg-[#0a0a0a]/90 backdrop-blur-sm z-10 border-b-2 border-white/10">
        <div className="h-full px-5 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <span className="text-base font-bold tracking-widest font-mono">PRISM</span>
            </button>
          </div>

          {/* Center: Query (truncated) */}
          <div className="flex-1 max-w-xl mx-8 text-center">
            <p className="truncate text-xs text-white/50 font-mono" title={query}>
              "{query}"
            </p>
          </div>

          {/* Right: History */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-mono hidden sm:inline">HISTORY</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT - Three Column Layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">
        {/* ─────────────────────────────────────────────────────────────
            LEFT SIDEBAR - Agent Roster
        ───────────────────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 bg-[#0a0a0a] flex flex-col border-r-2 border-white/10">
          {/* Header */}
          <div className="p-3 border-b-2 border-white/10">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/40 hover:text-white text-xs uppercase tracking-wider transition-colors px-2 py-2 hover:bg-white/[0.05] w-full font-mono"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>NEW CONSULTATION</span>
            </button>
          </div>

          {/* Agent List */}
          <div className="flex-1 p-3 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3 px-2 font-mono">
              CONSULTANTS
            </p>
            <div className="space-y-1">
              {visibleAgents.map((agentId) => {
                const isSelected = selectedAgentId === agentId;
                const color = AGENT_COLORS[agentId] || '#6B7280';
                const agent = agents[agentId];
                const name = AGENT_NAMES[agentId] || agentId;

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
                        alt={name}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/90 truncate font-mono uppercase tracking-wider">
                        {name}
                      </p>
                    </div>
                    {agent?.isStreaming && (
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
        </aside>

        {/* ─────────────────────────────────────────────────────────────
            CENTER - React Flow Canvas
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 relative">
          <DebateCanvas onNodeSelect={handleNodeSelect} designMode="boxy" />

          {/* Overlay: Waiting state */}
          {phase === 'idle' && !isDebating && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-[#F15A29] animate-spin mx-auto" />
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
        {selectedAgentId && agents[selectedAgentId] && (
          <aside className={`${isInspectorExpanded ? 'w-[600px]' : 'w-80'} flex-shrink-0 bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-200 transition-all border-l-2 border-white/10`}>
            {/* Header */}
            <div className="h-14 flex-shrink-0 px-4 flex items-center justify-between border-b-2 border-white/10">
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

      {/* Follow-up Input Bar */}
      {showFollowUp && (
        <div className="flex-shrink-0">
          <div className="flex">
            <div className="w-56 flex-shrink-0 bg-[#0a0a0a] border-r-2 border-white/10" />
            <div className="flex-1 bg-[#0a0a0a] px-5 py-2.5">
              <div className="max-w-3xl mx-auto">
                <form onSubmit={handleFollowUpSubmit}>
                  <div className="flex items-center gap-2 h-10 px-3 transition-all duration-200 bg-[#141414] border border-[#F15A29]/40">
                    <input
                      type="text"
                      value={followUpInput}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      placeholder="ASK A FOLLOW-UP QUESTION..."
                      className="flex-1 bg-transparent text-white outline-none text-sm placeholder-white/40 tracking-wide font-mono text-xs"
                    />
                    <button
                      type="submit"
                      disabled={!followUpInput.trim()}
                      className={`flex items-center justify-center w-7 h-7 flex-shrink-0 transition-all duration-200 ${
                        followUpInput.trim()
                          ? 'bg-[#F15A29] text-black hover:bg-[#F15A29]/90'
                          : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/20'
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
      )}

      {/* Timeline Bar */}
      <div className="flex-shrink-0">
        <div className="flex">
          <div className="w-56 flex-shrink-0 bg-[#0a0a0a] border-r-2 border-white/10" />
          <div className="flex-1">
            <TimelineBar elapsedMs={elapsedMs} designMode="boxy" />
          </div>
        </div>
      </div>
    </div>
  );
}
