import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Send, MessageSquarePlus, BarChart3, Clock } from 'lucide-react';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId, type AgentState, type BaseAgentId } from '@/types/agent';
import { useDebateStore } from '@/hooks/useDebateStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSessionStore } from '@/hooks/useSessionStore';
import { DotMatrixText } from '@/components/DotMatrixText';
import { SessionHistoryPanel } from '@/components/SessionHistoryPanel';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ConsultationSession } from '@/types/session';

// DiceBear Notionists avatar URL generator
const getAvatarUrl = (agentId: AgentId) => {
  // Use 'leader' seed for synthesizer for a more professional/confident look
  const seed = agentId === 'synthesizer' ? 'leader' : agentId;
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=transparent`;
};

// Format tokens per second for display
const formatTokPerSec = (tokensPerSecond: number): string => {
  if (tokensPerSecond <= 0) return '--';
  if (tokensPerSecond >= 1000) return `${(tokensPerSecond / 1000).toFixed(1)}k`;
  return tokensPerSecond.toFixed(0);
};

// Parse <think>...</think> tags from response
const parseThinkTags = (text: string): { thinking: string; answer: string; isThinkingInProgress: boolean } => {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const answer = text.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    return { thinking, answer, isThinkingInProgress: false };
  }
  // Handle incomplete think tag (still streaming thinking)
  const openThinkMatch = text.match(/<think>([\s\S]*)/);
  if (openThinkMatch && !text.includes('</think>')) {
    return { thinking: openThinkMatch[1].trim(), answer: '', isThinkingInProgress: true };
  }
  // No think tags - the text IS the answer
  return { thinking: '', answer: text, isThinkingInProgress: false };
};

// Parse citations like [1], [2], [3] from synthesizer text
const parseCitations = (text: string): { cleanText: string; citations: Map<number, string> } => {
  const citations = new Map<number, string>();

  // Agent mapping for citations
  const agentMap: Record<number, { name: string; agentId: AgentId }> = {
    1: { name: 'Analyst', agentId: 'analyst' },
    2: { name: 'Optimist', agentId: 'optimist' },
    3: { name: 'Pessimist', agentId: 'pessimist' },
    4: { name: 'Critic', agentId: 'critic' },
    5: { name: 'Strategist', agentId: 'strategist' },
    6: { name: 'Finance', agentId: 'finance' },
    7: { name: 'Risk', agentId: 'risk' },
  };

  // Find all citations in the text
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (agentMap[num] && !citations.has(num)) {
      citations.set(num, agentMap[num].name);
    }
  }

  return { cleanText: text, citations };
};

// Citation badge component
const CitationBadge = ({ num, agentId, designMode }: { num: number; agentId: AgentId; designMode: 'boxy' | 'round' }) => (
  <span
    className={`inline-flex items-center justify-center mx-0.5 text-[10px] font-mono cursor-pointer hover:opacity-80 transition-opacity ${
      designMode === 'round' ? 'rounded-full' : ''
    }`}
    style={{
      backgroundColor: `${AGENT_COLORS[agentId]}40`,
      color: AGENT_COLORS[agentId],
      padding: '0 4px',
      minWidth: '16px',
      height: '16px'
    }}
    title={`${AGENT_NAMES[agentId]}`}
  >
    {num}
  </span>
);

// Render text with clickable citations
const renderTextWithCitations = (text: string, designMode: 'boxy' | 'round', onCitationClick?: (agentId: AgentId) => void) => {
  const agentMap: Record<number, AgentId> = {
    1: 'analyst',
    2: 'optimist',
    3: 'pessimist',
    4: 'critic',
    5: 'strategist',
    6: 'finance',
    7: 'risk',
  };

  const parts = text.split(/(\[\d+\])/g);

  return parts.map((part, index) => {
    const match = part.match(/\[(\d+)\]/);
    if (match) {
      const num = parseInt(match[1], 10);
      const agentId = agentMap[num];
      if (agentId) {
        return (
          <span
            key={index}
            onClick={() => onCitationClick?.(agentId)}
            className="cursor-pointer"
          >
            <CitationBadge num={num} agentId={agentId} designMode={designMode} />
          </span>
        );
      }
    }
    return <span key={index}>{part}</span>;
  });
};

/**
 * DEBATE PAGE - LAYOUT SKELETON
 *
 * Three-column layout based on Linear.app / Figma / Perplexity patterns:
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  TOP BAR (56px) - Logo, Status, Token Counter                   │
 * ├──────────┬───────────────────────────────────────┬───────────────┤
 * │          │                                       │               │
 * │  LEFT    │           CENTER PANEL                │    RIGHT      │
 * │ SIDEBAR  │         (Debate Stream)               │  INSPECTOR    │
 * │  (240px) │                                       │   (360px)     │
 * │          │  ┌─────────────────────────────┐      │               │
 * │  Agent   │  │ Question (pinned)           │      │  (slides in   │
 * │  Roster  │  └─────────────────────────────┘      │  on select)   │
 * │          │                                       │               │
 * │          │  ┌─────────────────────────────┐      │               │
 * │          │  │ Debate Turn 1               │      │               │
 * │          │  └─────────────────────────────┘      │               │
 * │          │  ┌─────────────────────────────┐      │               │
 * │          │  │ Debate Turn 2               │      │               │
 * │          │  └─────────────────────────────┘      │               │
 * │          │                                       │               │
 * │          │  ┌─────────────────────────────┐      │               │
 * │          │  │ Constraint Input            │      │               │
 * │          │  └─────────────────────────────┘      │               │
 * ├──────────┴───────────────────────────────────────┴───────────────┤
 * │  BOTTOM BAR (48px) - Timeline Scrubber                          │
 * └──────────────────────────────────────────────────────────────────┘
 */

export function DebatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const modelTier = searchParams.get('model') || 'pro'; // Default to 'pro' if not specified
  const agentsParam = searchParams.get('agents'); // Custom agent selection
  const sessionIdParam = searchParams.get('session'); // Session ID for resuming

  // Parse selected agents from URL - if param exists, use it; otherwise will be set from session store
  const agentsFromUrl = agentsParam
    ? agentsParam.split(',').filter(a => AGENT_IDS.includes(a as BaseAgentId)) as BaseAgentId[]
    : null; // null means use session store's selection

  // Design mode toggle (matches homepage)
  const [designMode, setDesignMode] = useState<'boxy' | 'round'>('boxy');

  // Inspector visibility state
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);

  // Inspector expand/collapse state
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);
  const hasAutoOpenedSynth = useRef(false);

  // Top bar dialogs
  const [isBenchOpen, setIsBenchOpen] = useState(false);
  const [benchCopied, setBenchCopied] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Collapsible section state - for auto-open/close behavior
  const [isPerspectivesOpen, setIsPerspectivesOpen] = useState(true);
  const [openAgents, setOpenAgents] = useState<Set<AgentId>>(new Set());

  // Follow-up question state
  const [followUpInput, setFollowUpInput] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const hasHydratedSessionRef = useRef(false);

  // Session store for managing conversation history
  const {
    currentSession,
    getPreviousTurnsContext,
    startNewTurn,
    completeTurn,
    updateTurnResponse,
    loadSession,
    setSelectedAgents,
    selectedAgents: storeSelectedAgents,
  } = useSessionStore();

  // Effective selected agents: URL param takes precedence, then session store
  const selectedAgentsFromUrl = agentsFromUrl || storeSelectedAgents;

  // Store state
  const agents = useDebateStore((state) => state.agents);
  const debateQuery = useDebateStore((state) => state.query);
  const phase = useDebateStore((state) => state.phase);
  const isDebating = useDebateStore((state) => state.isDebating);
  const connectionState = useDebateStore((state) => state.connectionState);
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

  // Constraint input state (PRD: Interrupt & Inject)
  const [constraintInput, setConstraintInput] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);

  // WebSocket connection
  const { isReady, startDebateSession, injectConstraint } = useWebSocket({ autoConnect: true });

  // User constraint state from store
  const constraints = useDebateStore((state) => state.constraints);

  // Track debate start time for tok/s calculation
  const debateStartTime = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Track if this is a new debate or follow-up
  const hasStartedRef = useRef(false);

  // Reset auto-open state on new debate
  useEffect(() => {
    if (isDebating) {
      hasAutoOpenedSynth.current = false;
    }
  }, [isDebating, query]);

  // Auto-open synthesizer inspector on completion
  useEffect(() => {
    if (!isDebating || hasAutoOpenedSynth.current) return;
    if (synthesizerText && !synthesizerStreaming) {
      hasAutoOpenedSynth.current = true;
      setSelectedAgent('synthesizer');
      setIsInspectorOpen(true);
      setIsInspectorExpanded(true);
    }
  }, [isDebating, synthesizerText, synthesizerStreaming]);

  // Initialize selected agents from URL param if provided
  useEffect(() => {
    if (agentsFromUrl && agentsFromUrl.length > 0) {
      console.log('[DebatePage] Setting agents from URL:', agentsFromUrl);
      setSelectedAgents(agentsFromUrl);
    }
  }, []);

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

    useDebateStore.setState((state) => ({
      ...state,
      query: lastTurn.query,
      phase: 'complete',
      isDebating: false,
      agents: agentsState,
      tokensPerSecond: 0,
      totalTokens: 0,
      error: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      constraints: [],
      userProxyNode: null,
      checkpoints: [],
      activeCheckpointIndex: null,
      debateStartTime: null,
      completedTurns: turns.slice(0, -1).map((turn, index) => ({
        id: `turn-${index}-${turn.timestamp}`,
        query: turn.query,
        agentTexts: turn.agentResponses,
        timestamp: turn.timestamp,
      })),
      followUpNodes: turns.slice(1).map((turn, index) => ({
        id: `followup-${index}-${turn.timestamp}`,
        text: turn.query,
        timestamp: turn.timestamp,
        turnIndex: index + 1,
      })),
      currentTurnIndex: turns.length - 1,
    }));

    setShowFollowUp(lastTurn.isComplete);
    return true;
  }, []);

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

  // Start debate when connected and query is present
  useEffect(() => {
    if (hasHydratedSessionRef.current) return;
    if (query && !isDebating && phase === 'idle' && !hasStartedRef.current) {
      hasStartedRef.current = true;
      debateStartTime.current = Date.now();
      
      // Get previous context if this is a follow-up
      const previousContext = getPreviousTurnsContext();
      
      // Start a new turn in the session
      startNewTurn(query);
      
      // Log the agents being sent
      console.log('[DebatePage] Starting debate with agents:', selectedAgentsFromUrl);
      
      // Start the debate with context and agent selection
      startDebateSession(query, modelTier, previousContext, selectedAgentsFromUrl);
    }
  }, [query, modelTier, isDebating, phase, startDebateSession, getPreviousTurnsContext, startNewTurn, selectedAgentsFromUrl]);

  // Mark turn complete when debate ends
  useEffect(() => {
    if (hasHydratedSessionRef.current) return;
    if (phase === 'complete' && !isDebating) {
      completeTurn();
      setShowFollowUp(true); // Show follow-up input after debate completes
    }
  }, [phase, isDebating, completeTurn]);

  // Sync agent responses to session store (throttled to prevent infinite loops)
  const lastSyncedResponses = useRef<Record<string, string>>({});
  useEffect(() => {
    AGENT_IDS.forEach(agentId => {
      const agentText = agents[agentId].text;
      // Only update if text exists and has actually changed from last sync
      if (agentText && agentText !== lastSyncedResponses.current[agentId]) {
        lastSyncedResponses.current[agentId] = agentText;
        updateTurnResponse(agentId, agentText);
      }
    });
  }, [agents, updateTurnResponse]);

  // Update elapsed time during debate
  useEffect(() => {
    if (!isDebating || !debateStartTime.current) return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - (debateStartTime.current || Date.now()));
    }, 100);

    return () => clearInterval(interval);
  }, [isDebating]);

  // Auto-open/close perspectives based on streaming state
  useEffect(() => {
    const perspectiveAgents = selectedAgentsFromUrl.filter(id => id !== 'synthesizer');

    // Auto-open agents that are streaming, auto-close when done
    const newOpenAgents = new Set<AgentId>();
    perspectiveAgents.forEach(id => {
      if (agents[id]?.isStreaming) {
        newOpenAgents.add(id);
      }
    });
    setOpenAgents(newOpenAgents);

    // Auto-collapse perspectives when synthesizer is complete
    const hasSynthesis = agents.synthesizer?.text && !agents.synthesizer?.isStreaming;
    if (hasSynthesis) {
      setIsPerspectivesOpen(false);
    } else if (perspectiveAgents.some(id => agents[id]?.isStreaming)) {
      // Keep perspectives open while any perspective agent is streaming
      setIsPerspectivesOpen(true);
    }
  }, [agents, selectedAgentsFromUrl]);

  // Handle agent selection (from sidebar or center grid)
  const handleAgentClick = (agentId: AgentId) => {
    setSelectedAgent(agentId);
    setIsInspectorOpen(true);
  };

  // Handle citation click
  const handleCitationClick = (agentId: AgentId) => {
    handleAgentClick(agentId);
  };

  // Handle follow-up question submission
  const handleFollowUpSubmit = async (e: React.FormEvent) => {
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
    
    // 4. Reset the debate tracking ref so the effect will trigger
    hasStartedRef.current = false;
    debateStartTime.current = Date.now();
    
    // 5. Start a new turn in the session store
    startNewTurn(newQuery);
    
    // 6. Build context from previous turns and start the WebSocket debate
    const previousContext = getPreviousTurnsContext();
    console.log('[DebatePage] Starting follow-up with context length:', previousContext.length);
    startDebateSession(newQuery, modelTier, previousContext, selectedAgentsFromUrl);
    
    // Mark that we've started so the main effect doesn't double-trigger
    hasStartedRef.current = true;
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
    resetDebate();
    navigate('/');
  }, [navigate, resetDebate]);

  // Handle constraint injection (PRD: Interrupt & Inject)
  const handleInjectConstraint = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Inject] Handler called', { input: constraintInput, isReady, isInjecting, isDebating });

    if (!constraintInput.trim()) {
      console.log('[Inject] Empty input, returning');
      return;
    }

    if (!isReady) {
      console.log('[Inject] WebSocket not ready');
      return;
    }

    if (isInjecting) {
      console.log('[Inject] Already injecting');
      return;
    }

    setIsInjecting(true);
    const constraint = constraintInput.trim();
    console.log('[Inject] Processing constraint:', constraint);

    try {
      // Send to backend; UI updates on acknowledgment to avoid duplicates
      console.log('[Inject] Sending to backend...');
      const success = injectConstraint(constraint);
      console.log('[Inject] Backend send result:', success);

      // Clear input
      setConstraintInput('');
    } catch (error) {
      console.error('[Inject] Failed to inject constraint:', error);
    } finally {
      setIsInjecting(false);
    }
  };

  // Format elapsed time as M:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate timeline progress (12 second max)
  const timelineProgress = Math.min((elapsedMs / 12000) * 100, 100);

  // If no query, show redirect option
  if (!query) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/60 font-mono">NO QUESTION PROVIDED</p>
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
        designMode={designMode}
      />

      {/* ═══════════════════════════════════════════════════════════════
          TOP BAR - Logo, Status, Token Counter
          Height: 56px fixed
      ═══════════════════════════════════════════════════════════════ */}
      <header className="h-14 flex-shrink-0 border-b border-white/[0.06] bg-[#0a0a0a]">
        <div className="h-full px-5 flex items-center justify-between">
          {/* Left: Logo + Design Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <DotMatrixText
                text="PRISM"
                dotWidth={3}
                dotHeight={4}
                dotGap={1}
                letterGap={4}
                revealDelay={20}
                activeColor="#ffffff"
                inactiveColor="rgba(255,255,255,0.15)"
              />
            </button>
            {/* Design Mode Toggle */}
            <div className="flex items-center gap-1">
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
                    ? 'bg-white text-black rounded'
                    : 'bg-transparent text-white/50 border border-white/20 hover:text-white/70 rounded'
                }`}
              >
                Round
              </button>
            </div>
          </div>
          {/* Right: Actions + Cerebras Branding + Connection Status */}
          <div className="flex items-center gap-4">
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
                  <DialogDescription className="sr-only">
                    Performance metrics for the completed debate run.
                  </DialogDescription>

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

            <div className="flex items-center gap-4">
              {/* Cerebras Logo */}
              <img
                src="/cerebras-logo-white.png"
                alt="Cerebras"
                className="h-6 w-auto opacity-60"
              />

              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 ${designMode === 'round' ? 'rounded-full' : ''} ${
                  connectionState === 'connected' ? 'bg-emerald-500' :
                  connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  connectionState === 'error' ? 'bg-red-500' :
                  'bg-white/30'
                }`} />
                <span className={`text-[10px] text-white/30 ${designMode === 'boxy' ? 'font-mono uppercase' : ''}`}>
                  {connectionState === 'connected' ? (designMode === 'boxy' ? 'LIVE' : 'Live') :
                   connectionState === 'connecting' ? (designMode === 'boxy' ? 'CONNECTING' : 'Connecting') :
                   connectionState === 'error' ? (designMode === 'boxy' ? 'ERROR' : 'Error') :
                   (designMode === 'boxy' ? 'OFFLINE' : 'Offline')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT - Three Column Layout
          Takes remaining height
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">

        {/* ─────────────────────────────────────────────────────────────
            LEFT SIDEBAR - Agent Roster + Navigation
            Width: 240px (15-20% on large screens)
        ───────────────────────────────────────────────────────────── */}
        <aside className={`w-60 flex-shrink-0 bg-[#0a0a0a] flex flex-col ${designMode === 'boxy' ? 'border-r border-white/[0.08]' : 'border-r border-white/[0.06]'}`}>
          {/* Back Navigation */}
          <div className={`p-3 ${designMode === 'boxy' ? 'border-b border-white/[0.08]' : 'border-b border-white/[0.06]'}`}>
            <button
              onClick={() => {
                resetDebate();
                navigate('/');
              }}
              className={`flex items-center gap-2 text-white/40 hover:text-white text-xs uppercase tracking-wider transition-colors px-2 py-2 hover:bg-white/[0.05] w-full ${designMode === 'boxy' ? 'font-mono' : 'rounded-lg'}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{designMode === 'boxy' ? 'NEW CONSULTATION' : 'New Consultation'}</span>
            </button>
          </div>

          {/* Agent Roster */}
          <div className="flex-1 p-3 overflow-y-auto">
            <p className={`text-[10px] uppercase tracking-widest text-white/30 mb-3 px-2 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
              {designMode === 'boxy' ? 'YOUR CONSULTANTS' : 'Your Consultants'}
            </p>
            <div className="space-y-1">
              {AGENT_IDS.map((agentId) => {
                const isSelected = selectedAgent === agentId;
                const color = AGENT_COLORS[agentId];
                const agent = agents[agentId];
                const status = agent.isStreaming
                  ? (designMode === 'boxy' ? 'STREAMING...' : 'Streaming...')
                  : agent.text
                    ? (designMode === 'boxy' ? 'COMPLETE' : 'Complete')
                    : (designMode === 'boxy' ? 'WAITING...' : 'Waiting...');

                return (
                  <button
                    key={agentId}
                    onClick={() => handleAgentClick(agentId)}
                    className={`
                      w-full flex items-center gap-3 px-2 py-2 text-left
                      transition-all duration-150
                      ${designMode === 'round' ? 'rounded-lg' : ''}
                      ${isSelected
                        ? designMode === 'boxy' ? 'bg-white/[0.08]' : 'bg-white/[0.08]'
                        : designMode === 'boxy' ? 'hover:bg-white/[0.04]' : 'hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 flex-shrink-0 overflow-hidden ${designMode === 'boxy' ? '' : 'rounded-full'}`}
                      style={{ backgroundColor: color }}
                    >
                      <img
                        src={getAvatarUrl(agentId)}
                        alt={AGENT_NAMES[agentId]}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Name + Status */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs text-white/90 truncate ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}>
                        {AGENT_NAMES[agentId]}
                      </p>
                      <p className={`text-[10px] text-white/30 truncate ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                        {status}
                      </p>
                    </div>

                    {/* Token Rate Badge */}
                    {agent.tokensPerSecond > 0 && (
                      <div
                        className={`text-[9px] px-1.5 py-0.5 font-mono ${designMode === 'round' ? 'rounded' : ''}`}
                        style={{
                          backgroundColor: `${color}20`,
                          color: color
                        }}
                      >
                        {formatTokPerSec(agent.tokensPerSecond)} tok/s
                      </div>
                    )}

                    {/* Active Indicator */}
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

          {/* Bottom Section */}
          <div className={`p-3 ${designMode === 'boxy' ? 'border-t border-white/[0.08]' : 'border-t border-white/[0.06]'}`}>
            <div className={`flex items-center gap-2 px-2 py-1.5 text-white/25 text-[10px] ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}>
              <div className={`w-1.5 h-1.5 ${isDebating ? 'bg-emerald-500/80' : 'bg-white/30'} ${designMode === 'round' ? 'rounded-full' : ''}`} />
              <span>
                {(() => {
                  const streamingCount = selectedAgentsFromUrl.filter(id => agents[id]?.isStreaming).length;
                  const completedCount = selectedAgentsFromUrl.filter(id => agents[id]?.text && !agents[id]?.isStreaming).length;
                  const totalAgents = selectedAgentsFromUrl.length;
                  if (streamingCount > 0) {
                    return designMode === 'boxy' ? `${streamingCount} STREAMING` : `${streamingCount} streaming`;
                  } else if (completedCount > 0) {
                    return designMode === 'boxy' ? `${completedCount}/${totalAgents} COMPLETE` : `${completedCount}/${totalAgents} complete`;
                  }
                  return designMode === 'boxy' ? `${totalAgents} AGENTS` : `${totalAgents} agents`;
                })()}
              </span>
            </div>
          </div>
        </aside>

        {/* ─────────────────────────────────────────────────────────────
            CENTER PANEL - Debate Stream
            Width: Flexible (40-50%)
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
          {/* Question Header - Pinned */}
          <div className={`flex-shrink-0 p-4 ${designMode === 'boxy' ? 'border-b border-white/[0.08]' : 'border-b border-white/[0.06]'}`}>
            <div className={`p-4 ${designMode === 'boxy' ? 'bg-[#0f0f0f] border border-white/[0.08]' : 'bg-white/[0.03] border border-white/[0.06] rounded-xl'}`}>
              <p className={`text-center text-white/90 text-sm leading-relaxed ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                "{query}"
              </p>
            </div>
          </div>

          {/* Main Content - Perspectives First, Answer Last */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ═══ PERSPECTIVES (Auto-open/close based on streaming) ═══ */}
            {(() => {
              const perspectiveAgents = selectedAgentsFromUrl.filter(id => id !== 'synthesizer');
              const anyStreaming = perspectiveAgents.some(id => agents[id]?.isStreaming);
              const completedCount = perspectiveAgents.filter(id => agents[id]?.text).length;
              const totalPerspectives = perspectiveAgents.length;

              return (
                <details
                  className="group"
                  open={isPerspectivesOpen}
                  onToggle={(e) => setIsPerspectivesOpen((e.target as HTMLDetailsElement).open)}
                >
                  <summary className={`
                    flex items-center gap-2 cursor-pointer list-none select-none py-2
                    ${designMode === 'boxy' ? 'font-mono uppercase text-[10px] tracking-widest' : 'text-xs'}
                    text-white/40 hover:text-white/60 transition-colors
                  `}>
                    <svg
                      className={`w-3 h-3 transition-transform ${isPerspectivesOpen ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{designMode === 'boxy' ? 'CONSULTANT INSIGHTS' : 'Consultant Insights'}</span>
                    <span className="text-white/25">
                      ({completedCount}/{totalPerspectives})
                    </span>
                    {anyStreaming && (
                      <div className={`w-1.5 h-1.5 ml-1 ${designMode === 'round' ? 'rounded-full' : ''} bg-emerald-500 animate-pulse`} />
                    )}
                  </summary>

                  <div className="mt-3 space-y-2">
                    {perspectiveAgents.map((agentId) => {
                      const color = AGENT_COLORS[agentId];
                      const agent = agents[agentId];
                      const { thinking, answer: cleanAnswer, isThinkingInProgress } = parseThinkTags(agent.text);

                      // Use controlled state for open/close
                      const isOpen = openAgents.has(agentId);

                      if (!agent.text && !agent.isStreaming) return null;

                      return (
                        <details
                          key={agentId}
                          open={isOpen}
                          onToggle={(e) => {
                            const newOpen = (e.target as HTMLDetailsElement).open;
                            setOpenAgents(prev => {
                              const next = new Set(prev);
                              if (newOpen) next.add(agentId);
                              else next.delete(agentId);
                              return next;
                            });
                          }}
                        >
                          <summary className={`
                            flex items-center gap-2.5 p-3 cursor-pointer list-none
                            transition-all duration-150
                            ${designMode === 'boxy'
                              ? `bg-[#0f0f0f] border ${agent.isStreaming ? 'border-emerald-500/50' : 'border-white/[0.08]'} hover:border-white/20`
                              : `bg-white/[0.03] border ${agent.isStreaming ? 'border-emerald-500/30' : 'border-white/[0.06]'} hover:border-white/[0.12] rounded-lg`
                            }
                          `}>
                            <div
                              className={`w-5 h-5 overflow-hidden flex-shrink-0 ${designMode === 'boxy' ? '' : 'rounded-full'}`}
                              style={{ backgroundColor: color }}
                            >
                              <img src={getAvatarUrl(agentId)} alt={AGENT_NAMES[agentId]} className="w-full h-full" />
                            </div>
                            <span className={`text-xs text-white/60 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : 'font-medium'}`}>
                              {AGENT_NAMES[agentId]}
                            </span>

                            {/* Token Rate Badge */}
                            {agent.tokensPerSecond > 0 && (
                              <div
                                className={`text-[9px] px-1.5 py-0.5 font-mono ${designMode === 'round' ? 'rounded' : ''}`}
                                style={{
                                  backgroundColor: `${color}20`,
                                  color: color
                                }}
                              >
                                {formatTokPerSec(agent.tokensPerSecond)} tok/s
                              </div>
                            )}

                            {agent.isStreaming && (
                              <div className={`w-1.5 h-1.5 ${designMode === 'round' ? 'rounded-full' : ''} bg-emerald-500 animate-pulse`} />
                            )}
                            <svg
                              className={`w-3 h-3 ml-auto text-white/30 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </summary>

                          <div className={`
                            mt-1 p-4 space-y-3
                            ${designMode === 'boxy'
                              ? 'bg-[#0a0a0a] border-x border-b border-white/[0.08]'
                              : 'bg-white/[0.02] border-x border-b border-white/[0.06] rounded-b-lg'
                            }
                          `}>
                            {/* Thinking section (collapsible) */}
                            {thinking && (
                              <details className="group/think">
                                <summary className={`
                                  flex items-center gap-1.5 cursor-pointer list-none text-[10px] text-white/30 hover:text-white/50
                                  ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}
                                `}>
                                  <svg className="w-2.5 h-2.5 transition-transform group-open/think:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span>💭 {designMode === 'boxy' ? 'THINKING' : 'Thinking'}</span>
                                </summary>
                                <div className={`
                                  mt-2 p-3 text-[11px] leading-[1.5] text-white/30 italic
                                  ${designMode === 'boxy'
                                    ? 'bg-[#080808] border border-white/[0.04] font-mono text-[10px]'
                                    : 'bg-white/[0.01] border border-white/[0.04] rounded'
                                  }
                                `}>
                                  {thinking}
                                </div>
                              </details>
                            )}

                            {/* Clean answer - show thinking content if still in progress */}
                            <div className={`text-[13px] leading-[1.6] text-white/50 ${designMode === 'boxy' ? 'font-mono text-[12px]' : ''}`}>
                              {cleanAnswer || (isThinkingInProgress ? thinking : (agent.isStreaming ? '' : ''))}
                              {agent.isStreaming && <span className="animate-pulse">▊</span>}
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })()}

            {/* ═══ THE ANSWER (Synthesizer) ═══ */}
            {(() => {
              const agent = agents.synthesizer;
              const { thinking, answer: cleanAnswer, isThinkingInProgress } = parseThinkTags(agent.text);
              const isLoading = !agent.text && !agent.isStreaming && AGENT_IDS.slice(0, 7).some(id => agents[id].isStreaming || agents[id].text);
              const isStreaming = agent.isStreaming;
              const hasAnswer = cleanAnswer.length > 0;

              // Parse citations from the answer
              const { citations } = parseCitations(cleanAnswer);

              return (
                <div className={`
                  p-6 transition-all duration-300
                  ${designMode === 'boxy'
                    ? 'bg-gradient-to-b from-[#1a1612] to-[#0f0f0f] border-2 border-[#F15A29]/40'
                    : 'bg-gradient-to-b from-[#F15A29]/10 to-transparent backdrop-blur-xl border-2 border-[#F15A29]/30 rounded-2xl'
                  }
                `}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 overflow-hidden flex-shrink-0 ${designMode === 'boxy' ? '' : 'rounded-full'}`}
                      style={{ backgroundColor: '#F15A29' }}
                    >
                      <img src={getAvatarUrl('synthesizer')} alt="Answer" className="w-full h-full" />
                    </div>
                    <div>
                      <span className={`text-base ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider text-[#F15A29]' : 'font-semibold text-[#F15A29]'}`}>
                        {designMode === 'boxy' ? 'RECOMMENDATION' : 'Recommendation'}
                      </span>
                      <p className={`text-[11px] text-white/40 ${designMode === 'boxy' ? 'font-mono uppercase' : ''}`}>
                        {isLoading
                          ? (designMode === 'boxy' ? 'CONSULTING YOUR TEAM...' : 'Consulting your team...')
                          : isStreaming
                            ? (designMode === 'boxy' ? 'PREPARING RECOMMENDATION...' : 'Preparing recommendation...')
                            : hasAnswer
                              ? (designMode === 'boxy' ? 'YOUR PERSONALIZED RECOMMENDATION' : 'Your personalized recommendation')
                              : (designMode === 'boxy' ? 'WAITING...' : 'Waiting...')
                        }
                      </p>
                    </div>

                    {/* Token Rate Badge */}
                    {agent.tokensPerSecond > 0 && (
                      <div
                        className={`ml-auto text-[10px] px-2 py-1 font-mono ${designMode === 'round' ? 'rounded' : ''}`}
                        style={{
                          backgroundColor: '#F15A2920',
                          color: '#F15A29'
                        }}
                      >
                        {formatTokPerSec(agent.tokensPerSecond)} tok/s
                      </div>
                    )}

                    {isStreaming && !agent.tokensPerSecond && (
                      <div className={`w-2 h-2 ml-auto ${designMode === 'round' ? 'rounded-full' : ''} bg-emerald-500 animate-pulse`} />
                    )}
                  </div>

                  {/* Thinking section for synthesizer */}
                  {thinking && (
                    <details className="group/think mb-4" open={isThinkingInProgress}>
                      <summary className={`
                        flex items-center gap-1.5 cursor-pointer list-none text-[10px] text-white/30 hover:text-white/50
                        ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}
                      `}>
                        <svg className="w-2.5 h-2.5 transition-transform group-open/think:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span>💭 {designMode === 'boxy' ? 'THINKING' : 'Thinking'} {isThinkingInProgress && <span className="text-yellow-500/60">(in progress)</span>}</span>
                      </summary>
                      <div className={`
                        mt-2 p-3 text-[11px] leading-[1.5] text-white/30 italic max-h-[200px] overflow-y-auto
                        ${designMode === 'boxy'
                          ? 'bg-[#0a0a0a] border border-white/[0.06] font-mono text-[10px]'
                          : 'bg-black/20 border border-white/[0.06] rounded-lg'
                        }
                      `}>
                        {thinking}
                        {isThinkingInProgress && <span className="animate-pulse">▊</span>}
                      </div>
                    </details>
                  )}

                  {/* Clean Answer Text with Citations */}
                  <div className={`text-[15px] leading-[1.8] ${hasAnswer ? 'text-white/80' : 'text-white/40'} ${designMode === 'boxy' ? 'font-mono text-[14px]' : ''}`}>
                    {hasAnswer
                      ? renderTextWithCitations(cleanAnswer, designMode, handleCitationClick)
                      : (isLoading ? 'Analyzing your question from multiple angles...' : isThinkingInProgress ? '(thinking...)' : isStreaming ? '' : 'Waiting to synthesize...')
                    }
                    {isStreaming && cleanAnswer && <span className="animate-pulse">▊</span>}
                  </div>

                  {/* Sources Section - Show when synthesizer is done and has citations */}
                  {!isStreaming && hasAnswer && citations.size > 0 && (
                    <div className={`mt-6 pt-4 border-t border-white/[0.08] ${designMode === 'boxy' ? '' : ''}`}>
                      <p className={`text-[10px] uppercase tracking-widest text-white/30 mb-3 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                        {designMode === 'boxy' ? 'SOURCES' : 'Sources'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(citations.entries()).map(([num, name]) => {
                          const agentIdMap: Record<number, AgentId> = {
                            1: 'analyst', 2: 'optimist', 3: 'pessimist', 4: 'critic',
                            5: 'strategist', 6: 'finance', 7: 'risk'
                          };
                          const agentId = agentIdMap[num];
                          return (
                            <button
                              key={num}
                              onClick={() => handleCitationClick(agentId)}
                              className={`flex items-center gap-2 px-2 py-1.5 hover:bg-white/[0.05] transition-colors ${designMode === 'round' ? 'rounded-lg' : ''}`}
                              style={{ backgroundColor: `${AGENT_COLORS[agentId]}15` }}
                            >
                              <span
                                className={`text-[10px] font-mono w-5 h-5 flex items-center justify-center ${designMode === 'round' ? 'rounded-full' : ''}`}
                                style={{
                                  backgroundColor: `${AGENT_COLORS[agentId]}40`,
                                  color: AGENT_COLORS[agentId]
                                }}
                              >
                                {num}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-4 h-4 overflow-hidden ${designMode === 'boxy' ? '' : 'rounded-full'}`}
                                  style={{ backgroundColor: AGENT_COLORS[agentId] }}
                                >
                                  <img src={getAvatarUrl(agentId)} alt={name} className="w-full h-full" />
                                </div>
                                <span className="text-[11px] text-white/60">{name}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Input Bar - PRD: Interrupt & Inject (Floating Style) */}
          <div className="flex-shrink-0 p-4">
            <form onSubmit={handleInjectConstraint} className={`p-3 pb-2 transition-all duration-200 ${
              designMode === 'boxy'
                ? 'bg-[#111] border-2 border-white/30'
                : 'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl'
            }`}>
              {/* Input row */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={constraintInput}
                  onChange={(e) => setConstraintInput(e.target.value)}
                  placeholder={designMode === 'boxy' ? 'ADD A CONSTRAINT...' : 'Add a constraint...'}
                  disabled={!isReady || isInjecting}
                  className={`flex-1 bg-transparent text-white outline-none text-sm py-2 disabled:opacity-60 ${
                    designMode === 'boxy'
                      ? 'placeholder-white/30 tracking-wide font-mono'
                      : 'placeholder-white/40 font-sans'
                  }`}
                />
              </div>
              
              {/* Bottom bar with attach and submit */}
              <div className={`flex items-center justify-between mt-2 pt-2 ${designMode === 'boxy' ? 'border-t-2 border-white/10' : 'border-t border-white/10'}`}>
                {/* Left side - attach button */}
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
                
                {/* Right side - submit button */}
                <button
                  type="submit"
                  disabled={!constraintInput.trim() || !isReady || isInjecting}
                  className={`flex items-center justify-center w-8 h-8 transition-all duration-200 ${
                    constraintInput.trim() && isReady && !isInjecting
                      ? `bg-white text-black hover:bg-white/90 ${designMode === 'round' ? 'rounded-lg' : ''}`
                      : `bg-white/10 text-white/30 cursor-not-allowed border ${designMode === 'round' ? 'rounded-lg border-white/10' : 'border-white/20'}`
                  }`}
                >
                  {isInjecting ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>

            {/* DEBUG: Hardcoded test to verify rendering */}
            {constraints.length > 0 && (
              <div className="mt-2 px-3 py-2 bg-white/5 border border-white/10 text-white/50 text-[10px] font-mono">
                {constraints.length} constraint{constraints.length !== 1 ? 's' : ''} added
              </div>
            )}

            {/* Active Constraints Display */}
            <div className="mt-3 flex flex-wrap gap-2" style={{ minHeight: constraints.length > 0 ? 'auto' : '0' }}>
              {constraints.map((constraint, index) => (
                <div
                  key={index}
                  className={`px-3 py-1.5 text-[11px] bg-[#888888]/30 text-white/80 border border-[#888888]/50 ${designMode === 'boxy' ? 'font-mono uppercase' : 'rounded'}`}
                >
                  <span className="text-[#888888] mr-1">Constraint:</span> {constraint}
                </div>
              ))}
            </div>

            {/* Follow-up Question Input - Shows after debate completes */}
            {showFollowUp && phase === 'complete' && (
              <form onSubmit={handleFollowUpSubmit} className={`mt-4 p-3 pb-2 transition-all duration-200 ${
                designMode === 'boxy'
                  ? 'bg-[#1a1612] border-2 border-[#F15A29]/40'
                  : 'backdrop-blur-xl bg-[#F15A29]/10 border border-[#F15A29]/30 rounded-2xl'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquarePlus className="w-4 h-4 text-[#F15A29]" />
                  <span className={`text-[11px] text-[#F15A29] ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : 'font-medium'}`}>
                    {designMode === 'boxy' ? 'ASK A FOLLOW-UP QUESTION' : 'Ask a follow-up question'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder={designMode === 'boxy' ? 'CONTINUE THE CONVERSATION...' : 'Continue the conversation...'}
                    className={`flex-1 bg-transparent text-white outline-none text-sm py-2 disabled:opacity-60 ${
                      designMode === 'boxy'
                        ? 'placeholder-white/30 tracking-wide font-mono'
                        : 'placeholder-white/40 font-sans'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!followUpInput.trim() || !isReady}
                    className={`flex items-center justify-center w-8 h-8 transition-all duration-200 ${
                      followUpInput.trim() && isReady
                        ? `bg-[#F15A29] text-white hover:bg-[#F15A29]/90 ${designMode === 'round' ? 'rounded-lg' : ''}`
                        : `bg-white/10 text-white/30 cursor-not-allowed border ${designMode === 'round' ? 'rounded-lg border-white/10' : 'border-white/20'}`
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className={`mt-2 text-[10px] text-white/30 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                  {currentSession && currentSession.turns.length > 0 
                    ? `${currentSession.turns.length} question${currentSession.turns.length !== 1 ? 's' : ''} in this consultation`
                    : 'Your follow-up will build on the analysis above'
                  }
                </p>
              </form>
            )}
          </div>
        </main>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT SIDEBAR - Inspector Panel
            Width: 360px (30-40% when visible)
            Hidden by default, slides in on selection
        ───────────────────────────────────────────────────────────── */}
        {isInspectorOpen && selectedAgent && (
          <aside className={`${isInspectorExpanded ? 'w-[600px]' : 'w-[360px]'} flex-shrink-0 bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-200 transition-all ${designMode === 'boxy' ? 'border-l border-white/[0.08]' : 'border-l border-white/[0.06]'}`}>
            {/* Inspector Header */}
            <div className={`h-14 flex-shrink-0 px-4 flex items-center justify-between ${designMode === 'boxy' ? 'border-b border-white/[0.08]' : 'border-b border-white/[0.06]'}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 overflow-hidden ${designMode === 'boxy' ? '' : 'rounded-full'}`}
                  style={{ backgroundColor: AGENT_COLORS[selectedAgent] }}
                >
                  <img
                    src={getAvatarUrl(selectedAgent)}
                    alt={AGENT_NAMES[selectedAgent]}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className={`text-sm text-white/80 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider text-xs' : 'font-medium'}`}>{AGENT_NAMES[selectedAgent]}</p>
                  <p className={`text-[10px] text-white/30 ${designMode === 'boxy' ? 'font-mono uppercase' : ''}`}>{designMode === 'boxy' ? 'INSPECTOR' : 'Inspector'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Expand/Collapse button */}
                <button
                  onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
                  className={`text-white/30 hover:text-white/60 p-1.5 transition-colors ${designMode === 'round' ? 'rounded' : ''}`}
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
                  onClick={() => {
                    setIsInspectorOpen(false);
                    setSelectedAgent(null);
                  }}
                  className={`text-white/30 hover:text-white/60 p-1.5 transition-colors ${designMode === 'round' ? 'rounded' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Inspector Content - Full Response Only */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 text-[14px] text-white/80 leading-[1.7] prose prose-invert prose-sm max-w-none">
                {agents[selectedAgent].text ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                      h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-white/90">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-white/85">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-white/80">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-white/70">{children}</li>,
                      code: ({ children }) => <code className="bg-white/10 px-1.5 py-0.5 rounded text-[12px] font-mono text-white/80">{children}</code>,
                      pre: ({ children }) => <pre className="bg-white/5 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-white/20 pl-4 italic text-white/50 mb-4">{children}</blockquote>,
                      strong: ({ children }) => <strong className="text-white/95 font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="text-white/75 italic">{children}</em>,
                    }}
                  >
                    {agents[selectedAgent].text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '')}
                  </ReactMarkdown>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/30 italic">
                    Waiting for response...
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM BAR - Timeline + Cerebras Branding
          Height: 48px fixed
      ═══════════════════════════════════════════════════════════════ */}
      <footer className={`h-12 flex-shrink-0 bg-[#0a0a0a] px-5 flex items-center justify-between ${designMode === 'boxy' ? 'border-t border-white/[0.08]' : 'border-t border-white/[0.06]'}`}>
        {/* Timeline */}
        <div className="flex-1 flex items-center gap-3 max-w-xl">
          <span className={`text-[10px] text-white/25 tabular-nums ${designMode === 'boxy' ? 'font-mono' : ''}`}>{formatTime(elapsedMs)}</span>
          <div className={`flex-1 h-1 bg-white/[0.06] relative ${designMode === 'round' ? 'rounded-full' : ''}`}>
            <div
              className={`absolute left-0 top-0 h-full bg-white/30 transition-all duration-100 ${designMode === 'round' ? 'rounded-full' : ''}`}
              style={{ width: `${timelineProgress}%` }}
            />
          </div>
          <span className={`text-[10px] text-white/25 tabular-nums ${designMode === 'boxy' ? 'font-mono' : ''}`}>0:12</span>
        </div>

        {/* Cerebras Branding + Metrics */}
        <div className="flex items-center gap-4 ml-8">
          {totalTokens > 0 && (
            <span className={`text-[10px] text-white/40 tabular-nums ${designMode === 'boxy' ? 'font-mono' : ''}`}>
              {totalTokens} tokens
            </span>
          )}
          <img
            src="/cerebras-logo-white.png"
            alt="Cerebras"
            className="h-6 w-auto opacity-50"
          />
        </div>
      </footer>

    </div>
  );
}
