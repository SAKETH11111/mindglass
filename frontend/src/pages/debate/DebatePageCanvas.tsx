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
import { BarChart3, Clock } from 'lucide-react';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId, type AgentState, getAgentIdsForIndustry } from '@/types/agent';
import { useDebateStore } from '@/hooks/useDebateStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DebateCanvas } from '@/components/graph';
import { TimelineBar } from '@/components/TimelineBar';
import { useSessionStore } from '@/hooks/useSessionStore';
import { SessionHistoryPanel } from '@/components/SessionHistoryPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ConsultationSession } from '@/types/session';
import canvasBg from '@/assets/canvas_orb.png';

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
  const [isBenchOpen, setIsBenchOpen] = useState(false);
  const [benchCopied, setBenchCopied] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const hasStartedRef = useRef(false);
  const hasAutoOpenedSynth = useRef(false);
  const hasHydratedSessionRef = useRef(false);

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
  const benchmarkReport = useDebateStore((state) => state.benchmarkReport);

  const synthesizerText = agents.synthesizer?.text || '';
  const synthesizerStreaming = agents.synthesizer?.isStreaming || false;

  const derivedBench = useMemo(() => {
    if (!benchmarkReport) return null;
    const agentBench = Object.values(benchmarkReport.agents || {});
    let completionTokens = 0;
    let completionTime = 0;
    for (const a of agentBench) {
      if (typeof a.completionTokens === 'number') completionTokens += a.completionTokens;
      if (typeof a.completionTimeSec === 'number') completionTime += a.completionTimeSec;
    }
    const weightedTps = completionTime > 0 ? completionTokens / completionTime : null;
    return { completionTokens, completionTime, weightedTps };
  }, [benchmarkReport]);
  
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

  const hydrateFromSession = useCallback((session: ConsultationSession) => {
    if (!session.turns.length) return false;

    const turns = session.turns;
    const lastTurn = turns[turns.length - 1];
    const agentIds = lastTurn.selectedAgents.length > 0
      ? lastTurn.selectedAgents
      : (Object.keys(lastTurn.agentResponses) as AgentId[]);

    const agentsState = agentIds.reduce<Record<string, AgentState>>((acc, agentId) => {
      const text = lastTurn.agentResponses[agentId] || '';
      acc[agentId] = {
        id: agentId,
        name: AGENT_NAMES[agentId] || agentId,
        text,
        color: AGENT_COLORS[agentId] || '#6B7280',
        phase: 'complete',
        isActive: Boolean(text),
        isStreaming: false,
        tokenCount: 0,
        tokensPerSecond: 0,
        streamStartTime: null,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        completionTime: 0,
      };
      return acc;
    }, {});

    const completedTurns = turns.slice(0, -1).map((turn, index) => ({
      id: `turn-${index}-${turn.timestamp}`,
      query: turn.query,
      agentTexts: turn.agentResponses,
      timestamp: turn.timestamp,
    }));

    const followUpNodes = turns.slice(1).map((turn, index) => ({
      id: `followup-${index}-${turn.timestamp}`,
      text: turn.query,
      timestamp: turn.timestamp,
      turnIndex: index + 1,
    }));

    useDebateStore.setState((state) => ({
      ...state,
      query: lastTurn.query,
      phase: 'complete',
      isDebating: false,
      agents: agentsState,
      tokensPerSecond: 0,
      totalTokens: 0,
      error: null,
      currentIndustry: industryParam || null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      constraints: [],
      userProxyNode: null,
      checkpoints: [],
      activeCheckpointIndex: null,
      debateStartTime: null,
      completedTurns,
      followUpNodes,
      currentTurnIndex: turns.length - 1,
    }));

    setShowFollowUp(lastTurn.isComplete);
    setSelectedNodeId('node-synthesizer');
    return true;
  }, [industryParam]);

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
    hasHydratedSessionRef.current = false;
    if (!sessionIdParam) return;
    const session = loadSession(sessionIdParam);
    if (session && session.turns.length > 0) {
      hasStartedRef.current = true;
      hasHydratedSessionRef.current = hydrateFromSession(session);
    }
  }, [sessionIdParam, loadSession, hydrateFromSession]);

  // Reset store when URL query changes from home page navigation (not follow-ups)
  const lastUrlQueryRef = useRef<string>(query || '');
  useEffect(() => {
    // Only reset if the URL query itself changed (new debate from home page)
    // NOT if the store query changed (which happens during follow-ups)
    if (sessionIdParam) return;
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
    if (hasHydratedSessionRef.current) return;
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
    if (hasHydratedSessionRef.current) return;
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

          {/* Right: Bench + History */}
          <div className="flex items-center gap-3">
            <Dialog open={isBenchOpen} onOpenChange={setIsBenchOpen}>
              <DialogTrigger asChild>
                <button
                  disabled={!benchmarkReport}
                  className={`
                    flex items-center gap-2 transition-colors
                    ${benchmarkReport ? 'text-white/50 hover:text-white' : 'text-white/20 cursor-not-allowed'}
                  `}
                  title={benchmarkReport ? 'View benchmark report' : 'Benchmark available after the run completes'}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider font-mono hidden sm:inline">BENCH</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-[#0a0a0a] border border-white/10 text-white">
                <DialogHeader>
                  <div className="flex items-center justify-between gap-3">
                    <DialogTitle className="text-sm font-mono uppercase tracking-widest text-white/80">
                      Benchmark Report
                    </DialogTitle>
                    <button
                      type="button"
                      disabled={!benchmarkReport}
                      onClick={async () => {
                        if (!benchmarkReport) return;
                        try {
                          await navigator.clipboard.writeText(JSON.stringify(benchmarkReport, null, 2));
                          setBenchCopied(true);
                          window.setTimeout(() => setBenchCopied(false), 1200);
                        } catch {
                          // Best-effort; clipboard might be blocked in some contexts.
                        }
                      }}
                      className={`
                        px-2 py-1 border text-[10px] font-mono uppercase tracking-wider transition-colors
                        ${benchmarkReport ? 'border-white/15 text-white/60 hover:text-white hover:border-white/30' : 'border-white/10 text-white/20 cursor-not-allowed'}
                      `}
                      title={benchmarkReport ? 'Copy benchmark JSON' : 'Benchmark available after the run completes'}
                    >
                      {benchCopied ? 'COPIED' : 'COPY JSON'}
                    </button>
                  </div>
                </DialogHeader>

                {benchmarkReport ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/[0.03] border border-white/[0.06] p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">E2E</p>
                        <p className="text-xl font-mono text-white/90">
                          {(benchmarkReport.e2eMs / 1000).toFixed(2)}s
                        </p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">TTFT (first token)</p>
                        <p className="text-xl font-mono text-white/90">
                          {benchmarkReport.firstTokenMs !== null ? `${benchmarkReport.firstTokenMs}ms` : '--'}
                        </p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">Weighted TPS</p>
                        <p className="text-xl font-mono text-[#F15A29]">
                          {derivedBench?.weightedTps ? Math.round(derivedBench.weightedTps).toLocaleString() : '--'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">Rounds</p>
                        <div className="space-y-1">
                          {Object.entries(benchmarkReport.rounds || {})
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([roundNum, round]) => (
                              <div key={roundNum} className="flex items-center justify-between text-xs font-mono">
                                <span className="text-white/70">
                                  {roundNum}. {round.name}
                                </span>
                                <span className="text-white/50">{round.durationMs}ms</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">Totals</p>
                        <div className="space-y-1 text-xs font-mono text-white/70">
                          <div className="flex items-center justify-between">
                            <span>Completion tokens</span>
                            <span className="text-white/50">
                              {derivedBench?.completionTokens ? derivedBench.completionTokens.toLocaleString() : '--'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Completion time</span>
                            <span className="text-white/50">
                              {derivedBench?.completionTime ? `${derivedBench.completionTime.toFixed(2)}s` : '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] p-3">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">Agents</p>
                      <div className="grid grid-cols-7 gap-2 text-[10px] font-mono uppercase tracking-wider text-white/40">
                        <span>Agent</span>
                        <span>Rnd</span>
                        <span>Model</span>
                        <span>TTFT</span>
                        <span>ITL</span>
                        <span>Tok</span>
                        <span>TPS</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {Object.entries(benchmarkReport.agents || {})
                          .sort((a, b) => {
                            const ar = a[1].round ?? 99;
                            const br = b[1].round ?? 99;
                            if (ar !== br) return ar - br;
                            return a[0].localeCompare(b[0]);
                          })
                          .map(([agentId, a]) => (
                            <div key={agentId} className="grid grid-cols-7 gap-2 text-xs font-mono text-white/70">
                              <span className="text-white/90">{agentId}</span>
                              <span className="text-white/50">{a.round}</span>
                              <span className="text-white/50 truncate" title={a.model}>{a.model}</span>
                              <span className="text-white/50">{a.ttftMs !== null ? `${a.ttftMs}ms` : '--'}</span>
                              <span className="text-white/50">{a.avgItlMs !== null ? `${a.avgItlMs}ms` : '--'}</span>
                              <span className="text-white/50">{typeof a.completionTokens === 'number' ? a.completionTokens.toLocaleString() : '--'}</span>
                              <span className="text-[#F15A29]">{typeof a.tokensPerSecond === 'number' ? Math.round(a.tokensPerSecond).toLocaleString() : '--'}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/50 font-mono">No benchmark report available.</p>
                )}
              </DialogContent>
            </Dialog>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-mono hidden sm:inline">HISTORY</span>
            </button>
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
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${canvasBg})` }}
            />
            <div className="absolute inset-0 bg-[#0a0a0a]/70" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
          </div>
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
