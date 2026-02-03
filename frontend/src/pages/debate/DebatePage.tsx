import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';
import { useDebateStore } from '@/hooks/useDebateStore';
import { useWebSocket } from '@/hooks/useWebSocket';

// DiceBear Notionists avatar URL generator
const getAvatarUrl = (agentId: AgentId) => 
  `https://api.dicebear.com/7.x/notionists/svg?seed=${agentId}&backgroundColor=transparent`;

// Format tokens per second for display
const formatTokPerSec = (tokenCount: number, elapsedMs: number): string => {
  if (elapsedMs <= 0 || tokenCount <= 0) return '--';
  const tokPerSec = (tokenCount / elapsedMs) * 1000;
  if (tokPerSec >= 1000) return `${(tokPerSec / 1000).toFixed(1)}k`;
  return tokPerSec.toFixed(0);
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
  
  // Design mode toggle (matches homepage)
  const [designMode, setDesignMode] = useState<'boxy' | 'round'>('boxy');
  
  // Inspector visibility state
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);
  
  // Collapsible section state - for auto-open/close behavior
  const [isPerspectivesOpen, setIsPerspectivesOpen] = useState(true);
  const [openAgents, setOpenAgents] = useState<Set<AgentId>>(new Set());
  
  // Store state
  const agents = useDebateStore((state) => state.agents);
  const phase = useDebateStore((state) => state.phase);
  const isDebating = useDebateStore((state) => state.isDebating);
  const connectionState = useDebateStore((state) => state.connectionState);
  const totalTokens = useDebateStore((state) => state.totalTokens);
  
  // WebSocket connection
  const { isReady, startDebateSession } = useWebSocket();
  
  // Track debate start time for tok/s calculation
  const debateStartTime = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  
  // Start debate when connected and query is present
  useEffect(() => {
    if (isReady && query && !isDebating && phase === 'idle') {
      debateStartTime.current = Date.now();
      startDebateSession(query, modelTier);
    }
  }, [isReady, query, modelTier, isDebating, phase, startDebateSession]);
  
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
    const perspectiveAgents = ['analyst', 'optimist', 'pessimist', 'critic', 'strategist', 'finance', 'risk'] as AgentId[];
    
    // Auto-open agents that are streaming, auto-close when done
    const newOpenAgents = new Set<AgentId>();
    perspectiveAgents.forEach(id => {
      if (agents[id].isStreaming) {
        newOpenAgents.add(id);
      }
    });
    setOpenAgents(newOpenAgents);
    
    // Auto-collapse perspectives when synthesizer is complete
    const hasSynthesis = agents.synthesizer.text && !agents.synthesizer.isStreaming;
    if (hasSynthesis) {
      setIsPerspectivesOpen(false);
    } else if (perspectiveAgents.some(id => agents[id].isStreaming)) {
      // Keep perspectives open while any perspective agent is streaming
      setIsPerspectivesOpen(true);
    }
  }, [agents]);
  
  // Handle agent selection (from sidebar or center grid)
  const handleAgentClick = (agentId: AgentId) => {
    setSelectedAgent(agentId);
    setIsInspectorOpen(true);
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
              <span className={`text-base font-bold tracking-widest ${designMode === 'boxy' ? 'font-mono' : ''}`}>PRISM</span>
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
          {/* Right: Connection Status + Phase */}
          <div className="flex items-center gap-4">
            {/* Phase Indicator */}
            {phase !== 'idle' && (
              <span className={`text-[10px] text-white/50 uppercase tracking-wider ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                {phase}
              </span>
            )}
            
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
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 text-white/40 hover:text-white text-xs uppercase tracking-wider transition-colors px-2 py-2 hover:bg-white/[0.05] w-full ${designMode === 'boxy' ? 'font-mono' : 'rounded-lg'}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{designMode === 'boxy' ? 'NEW QUESTION' : 'New Question'}</span>
            </button>
          </div>
          
          {/* Agent Roster */}
          <div className="flex-1 p-3 overflow-y-auto">
            <p className={`text-[10px] uppercase tracking-widest text-white/30 mb-3 px-2 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
              {designMode === 'boxy' ? 'AGENTS' : 'Agents'}
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
                  const streamingCount = AGENT_IDS.filter(id => agents[id].isStreaming).length;
                  const completedCount = AGENT_IDS.filter(id => agents[id].text && !agents[id].isStreaming).length;
                  if (streamingCount > 0) {
                    return designMode === 'boxy' ? `${streamingCount} STREAMING` : `${streamingCount} streaming`;
                  } else if (completedCount > 0) {
                    return designMode === 'boxy' ? `${completedCount}/8 COMPLETE` : `${completedCount}/8 complete`;
                  }
                  return designMode === 'boxy' ? '8 AGENTS' : '8 agents';
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
              const perspectiveAgents = ['analyst', 'optimist', 'pessimist', 'critic', 'strategist', 'finance', 'risk'] as AgentId[];
              const anyStreaming = perspectiveAgents.some(id => agents[id].isStreaming);
              
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
                    <span>{designMode === 'boxy' ? 'PERSPECTIVES' : 'Perspectives'}</span>
                    <span className="text-white/25">
                      ({perspectiveAgents.filter(id => agents[id].text).length}/7)
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
                        {designMode === 'boxy' ? 'ANSWER' : 'Answer'}
                      </span>
                      <p className={`text-[11px] text-white/40 ${designMode === 'boxy' ? 'font-mono uppercase' : ''}`}>
                        {isLoading 
                          ? (designMode === 'boxy' ? 'GATHERING PERSPECTIVES...' : 'Gathering perspectives...')
                          : isStreaming 
                            ? (designMode === 'boxy' ? 'SYNTHESIZING...' : 'Synthesizing...')
                            : hasAnswer
                              ? (designMode === 'boxy' ? 'FROM 7 PERSPECTIVES' : 'From 7 perspectives')
                              : (designMode === 'boxy' ? 'WAITING...' : 'Waiting...')
                        }
                      </p>
                    </div>
                    {isStreaming && (
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
                  
                  {/* Clean Answer Text */}
                  <div className={`text-[15px] leading-[1.8] ${hasAnswer ? 'text-white/80' : 'text-white/40'} ${designMode === 'boxy' ? 'font-mono text-[14px]' : ''}`}>
                    {cleanAnswer || (isLoading ? 'Analyzing your question from multiple angles...' : isThinkingInProgress ? '(thinking...)' : isStreaming ? '' : 'Waiting to synthesize...')}
                    {isStreaming && cleanAnswer && <span className="animate-pulse">▊</span>}
                  </div>
                </div>
              );
            })()}
            
          </div>
          
          {/* Input Bar */}
          <div className={`flex-shrink-0 p-4 ${designMode === 'boxy' ? 'border-t border-white/[0.08]' : 'border-t border-white/[0.06]'}`}>
            <div className={`h-11 flex items-center gap-3 px-4 ${designMode === 'boxy' ? 'bg-[#0f0f0f] border border-white/[0.08]' : 'bg-white/[0.03] border border-white/[0.06] rounded-lg'}`}>
              <input 
                type="text"
                placeholder={designMode === 'boxy' ? 'ADD A CONSTRAINT...' : 'Add a constraint...'}
                className={`flex-1 bg-transparent text-white/70 placeholder-white/25 text-sm outline-none ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider text-xs' : ''}`}
              />
              <button className={`w-7 h-7 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors ${designMode === 'round' ? 'rounded' : ''}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>
        </main>
        
        {/* ─────────────────────────────────────────────────────────────
            RIGHT SIDEBAR - Inspector Panel
            Width: 360px (30-40% when visible)
            Hidden by default, slides in on selection
        ───────────────────────────────────────────────────────────── */}
        {isInspectorOpen && selectedAgent && (
          <aside className={`w-[360px] flex-shrink-0 bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-200 ${designMode === 'boxy' ? 'border-l border-white/[0.08]' : 'border-l border-white/[0.06]'}`}>
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
            
            {/* Inspector Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Full Response */}
                <div>
                  <p className={`text-[10px] uppercase tracking-widest text-white/25 mb-2.5 ${designMode === 'boxy' ? 'font-mono' : ''}`}>{designMode === 'boxy' ? 'RESPONSE' : 'Response'}</p>
                  <div className={`p-4 text-[13px] text-white/50 leading-relaxed min-h-[160px] max-h-[300px] overflow-y-auto ${designMode === 'boxy' ? 'bg-[#0f0f0f] border border-white/[0.08] font-mono text-xs' : 'bg-white/[0.03] border border-white/[0.06] rounded-lg'}`}>
                    {agents[selectedAgent].text || 'Waiting for response...'}
                  </div>
                </div>
                
                {/* Metadata */}
                <div>
                  <p className={`text-[10px] uppercase tracking-widest text-white/25 mb-2.5 ${designMode === 'boxy' ? 'font-mono' : ''}`}>{designMode === 'boxy' ? 'METADATA' : 'Metadata'}</p>
                  <div className={`p-3 space-y-2.5 text-[11px] ${designMode === 'boxy' ? 'bg-[#0f0f0f] border border-white/[0.08] font-mono text-[10px]' : 'bg-white/[0.03] border border-white/[0.06] rounded-lg'}`}>
                    <div className="flex justify-between">
                      <span className={`text-white/40 ${designMode === 'boxy' ? 'uppercase' : ''}`}>{designMode === 'boxy' ? 'Tokens' : 'Tokens'}</span>
                      <span className="text-white/60">{agents[selectedAgent].tokenCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-white/40 ${designMode === 'boxy' ? 'uppercase' : ''}`}>{designMode === 'boxy' ? 'Tok/s' : 'Tok/s'}</span>
                      <span className="text-white/60">{formatTokPerSec(agents[selectedAgent].tokenCount, elapsedMs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-white/40 ${designMode === 'boxy' ? 'uppercase' : ''}`}>{designMode === 'boxy' ? 'Status' : 'Status'}</span>
                      <span className="text-white/60">
                        {agents[selectedAgent].isStreaming 
                          ? (designMode === 'boxy' ? 'STREAMING' : 'Streaming')
                          : agents[selectedAgent].text
                            ? (designMode === 'boxy' ? 'COMPLETE' : 'Complete')
                            : (designMode === 'boxy' ? 'WAITING' : 'Waiting')
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-white/40 ${designMode === 'boxy' ? 'uppercase' : ''}`}>{designMode === 'boxy' ? 'Phase' : 'Phase'}</span>
                      <span className="text-white/60">{agents[selectedAgent].phase || phase}</span>
                    </div>
                  </div>
                </div>
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
          <div className="flex items-center gap-2">
            <img
              src="/cerebras-logo.svg"
              alt="Cerebras"
              className="w-4 h-4 opacity-50"
            />
            <span className={`text-[10px] text-white/30 uppercase tracking-wider ${designMode === 'boxy' ? 'font-mono' : ''}`}>
              Cerebras
            </span>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
