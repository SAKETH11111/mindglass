import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AGENT_IDS, AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';

// DiceBear Notionists avatar URL generator
const getAvatarUrl = (agentId: AgentId) => 
  `https://api.dicebear.com/7.x/notionists/svg?seed=${agentId}&backgroundColor=transparent`;

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
  
  // Design mode toggle (matches homepage)
  const [designMode, setDesignMode] = useState<'boxy' | 'round'>('boxy');
  
  // Inspector visibility state
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);
  
  // Handle agent selection (from sidebar or center grid)
  const handleAgentClick = (agentId: AgentId) => {
    setSelectedAgent(agentId);
    setIsInspectorOpen(true);
  };
  
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
      <header className="h-14 flex-shrink-0 border-b-2 border-white/10 bg-[#0a0a0a]">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: Logo + Design Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <span className={`text-base font-bold tracking-widest ${designMode === 'boxy' ? 'font-mono' : ''}`}>PRISM</span>
            </button>
            <div className="w-px h-5 bg-white/20" />
            <span className={`text-[10px] uppercase tracking-widest text-white/40 ${designMode === 'boxy' ? 'font-mono' : ''}`}>DEBATE</span>
            <div className="w-px h-5 bg-white/20" />
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
          
          {/* Right: Status */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-[10px] text-white/50 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
              <span>TOKENS:</span>
              <span className="text-white/80">0</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 bg-green-500 animate-pulse ${designMode === 'round' ? 'rounded-full' : ''}`} />
              <span className={`text-[10px] uppercase tracking-wider text-white/50 ${designMode === 'boxy' ? 'font-mono' : ''}`}>LIVE</span>
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
        <aside className={`w-60 flex-shrink-0 bg-[#0a0a0a] flex flex-col ${designMode === 'boxy' ? 'border-r-2 border-white/10' : 'border-r border-white/[0.08]'}`}>
          {/* Back Navigation */}
          <div className={`p-3 ${designMode === 'boxy' ? 'border-b-2 border-white/10' : 'border-b border-white/[0.08]'}`}>
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
                
                return (
                  <button
                    key={agentId}
                    onClick={() => handleAgentClick(agentId)}
                    className={`
                      w-full flex items-center gap-3 px-2 py-2 text-left
                      transition-all duration-150
                      ${designMode === 'round' ? 'rounded-lg' : ''}
                      ${isSelected 
                        ? designMode === 'boxy' ? 'bg-white/10 border border-white/30' : 'bg-white/10 border border-white/20 rounded-lg'
                        : designMode === 'boxy' ? 'hover:bg-white/[0.05] border border-transparent' : 'hover:bg-white/[0.05] border border-transparent rounded-lg'
                      }
                    `}
                  >
                    {/* Avatar */}
                    <div 
                      className={`w-7 h-7 flex-shrink-0 overflow-hidden ${designMode === 'boxy' ? 'border border-white/30' : 'rounded-full border-2 border-black/50'}`}
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
                        {designMode === 'boxy' ? 'STREAMING...' : 'Streaming...'}
                      </p>
                    </div>
                    
                    {/* Active Indicator */}
                    <div 
                      className={`w-2 h-2 flex-shrink-0 animate-pulse ${designMode === 'round' ? 'rounded-full' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Bottom Section */}
          <div className={`p-3 ${designMode === 'boxy' ? 'border-t-2 border-white/10' : 'border-t border-white/[0.08]'}`}>
            <div className={`flex items-center gap-2 px-2 py-1.5 text-white/30 text-[10px] uppercase tracking-wider ${designMode === 'boxy' ? 'font-mono' : ''}`}>
              <div className={`w-2 h-2 bg-green-500 animate-pulse ${designMode === 'round' ? 'rounded-full' : ''}`} />
              <span>{designMode === 'boxy' ? '8 AGENTS ACTIVE' : '8 agents active'}</span>
            </div>
          </div>
        </aside>
        
        {/* ─────────────────────────────────────────────────────────────
            CENTER PANEL - Debate Stream
            Width: Flexible (40-50%)
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
          {/* Question Header - Pinned */}
          <div className={`flex-shrink-0 p-4 ${designMode === 'boxy' ? 'border-b-2 border-white/10' : 'border-b border-white/[0.08]'}`}>
            <div className={`p-4 ${designMode === 'boxy' ? 'bg-[#111] border-2 border-white/20' : 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl'}`}>
              <p className={`text-center text-white/90 text-sm leading-relaxed ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                "{query}"
              </p>
            </div>
          </div>
          
          {/* Debate Stream - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* All agents respond in PARALLEL - not sequential turns */}
            <div className="grid grid-cols-2 gap-3">
              {AGENT_IDS.map((agentId) => {
                const color = AGENT_COLORS[agentId];
                const isSelected = selectedAgent === agentId;
                
                return (
                  <div 
                    key={agentId}
                    onClick={() => handleAgentClick(agentId)}
                    className={`
                      min-h-[140px] p-4
                      transition-all duration-150 cursor-pointer
                      ${designMode === 'boxy' 
                        ? `bg-[#111] border-2 ${isSelected ? 'border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-white/20 hover:border-white/40 hover:bg-[#151515]'}`
                        : `bg-white/5 backdrop-blur-xl border rounded-2xl ${isSelected ? 'border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.08]'}`
                      }
                    `}
                  >
                    {/* Agent Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className={`w-6 h-6 overflow-hidden flex-shrink-0 ${designMode === 'boxy' ? 'border border-white/30' : 'rounded-full border-2 border-black/50'}`}
                        style={{ backgroundColor: color }}
                      >
                        <img 
                          src={getAvatarUrl(agentId)} 
                          alt={AGENT_NAMES[agentId]}
                          className="w-full h-full"
                        />
                      </div>
                      <span className={`text-xs text-white/80 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : 'font-medium'}`}>
                        {AGENT_NAMES[agentId]}
                      </span>
                      <div 
                        className={`w-1.5 h-1.5 animate-pulse ml-auto ${designMode === 'round' ? 'rounded-full' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    
                    {/* Response Text Area (placeholder) */}
                    <div className={`text-xs text-white/50 leading-relaxed ${designMode === 'boxy' ? 'font-mono' : ''}`}>
                      <span className="text-white/30">Analyzing the question and formulating response...</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Input Bar */}
          <div className={`flex-shrink-0 p-4 ${designMode === 'boxy' ? 'border-t-2 border-white/10' : 'border-t border-white/[0.08]'}`}>
            <div className={`h-12 flex items-center px-4 ${designMode === 'boxy' ? 'bg-[#111] border-2 border-white/20' : 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl'}`}>
              <input 
                type="text"
                placeholder={designMode === 'boxy' ? 'ADD A CONSTRAINT...' : 'Add a constraint...'}
                className={`flex-1 bg-transparent text-white/80 placeholder-white/30 text-xs outline-none ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}
              />
              <button className={`w-8 h-8 flex items-center justify-center border text-white/50 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all ${designMode === 'boxy' ? 'border-white/20' : 'border-white/10 rounded-lg'}`}>
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
          <aside className={`w-[360px] flex-shrink-0 bg-[#0a0a0a] flex flex-col animate-in slide-in-from-right duration-200 ${designMode === 'boxy' ? 'border-l-2 border-white/10' : 'border-l border-white/[0.08]'}`}>
            {/* Inspector Header */}
            <div className={`h-14 flex-shrink-0 px-4 flex items-center justify-between ${designMode === 'boxy' ? 'border-b-2 border-white/10' : 'border-b border-white/[0.08]'}`}>
              <div className="flex items-center gap-3">
                <div 
                  className={`w-8 h-8 overflow-hidden ${designMode === 'boxy' ? 'border border-white/30' : 'rounded-full border-2 border-black/50'}`}
                  style={{ backgroundColor: AGENT_COLORS[selectedAgent] }}
                >
                  <img 
                    src={getAvatarUrl(selectedAgent)} 
                    alt={AGENT_NAMES[selectedAgent]}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className={`text-xs text-white/90 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : 'font-medium'}`}>{AGENT_NAMES[selectedAgent]}</p>
                  <p className={`text-[10px] text-white/40 ${designMode === 'boxy' ? 'font-mono uppercase' : ''}`}>{designMode === 'boxy' ? 'INSPECTOR' : 'Inspector'}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsInspectorOpen(false);
                  setSelectedAgent(null);
                }}
                className={`text-white/40 hover:text-white p-1.5 border border-transparent hover:border-white/30 hover:bg-white/10 transition-all ${designMode === 'round' ? 'rounded-lg' : ''}`}
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
                  <p className={`text-[10px] uppercase tracking-widest text-white/30 mb-2 ${designMode === 'boxy' ? 'font-mono' : ''}`}>{designMode === 'boxy' ? 'FULL RESPONSE' : 'Full Response'}</p>
                  <div className={`p-4 text-xs text-white/60 leading-relaxed min-h-[160px] ${designMode === 'boxy' ? 'bg-[#111] border-2 border-white/20 font-mono' : 'bg-white/5 border border-white/10 rounded-xl'}`}>
                    Response content will stream here...
                  </div>
                </div>
                
                {/* Reasoning */}
                <div>
                  <p className={`text-[10px] uppercase tracking-widest text-white/30 mb-2 ${designMode === 'boxy' ? 'font-mono' : ''}`}>{designMode === 'boxy' ? 'REASONING' : 'Reasoning'}</p>
                  <div className={`p-4 text-xs text-white/40 leading-relaxed min-h-[100px] ${designMode === 'boxy' ? 'bg-[#111] border-2 border-white/20 font-mono' : 'bg-white/5 border border-white/10 rounded-xl'}`}>
                    Internal reasoning and thought process...
                  </div>
                </div>
                
                {/* Metadata */}
                <div>
                  <p className={`text-[10px] uppercase tracking-widest text-white/30 mb-2 ${designMode === 'boxy' ? 'font-mono' : ''}`}>{designMode === 'boxy' ? 'METADATA' : 'Metadata'}</p>
                  <div className={`p-3 space-y-2 text-[10px] ${designMode === 'boxy' ? 'bg-[#111] border-2 border-white/20 font-mono' : 'bg-white/5 border border-white/10 rounded-xl'}`}>
                    <div className="flex justify-between">
                      <span className={`text-white/40 ${designMode === 'boxy' ? 'uppercase' : ''}`}>{designMode === 'boxy' ? 'Tokens' : 'Tokens'}</span>
                      <span className="text-white/60">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-white/40 ${designMode === 'boxy' ? 'uppercase' : ''}`}>{designMode === 'boxy' ? 'Latency' : 'Latency'}</span>
                      <span className="text-white/60">--ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-white/40 ${designMode === 'boxy' ? 'uppercase' : ''}`}>{designMode === 'boxy' ? 'Status' : 'Status'}</span>
                      <span className="text-white/60">{designMode === 'boxy' ? 'STREAMING' : 'Streaming'}</span>
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
      <footer className={`h-12 flex-shrink-0 bg-[#0a0a0a] px-4 flex items-center justify-between ${designMode === 'boxy' ? 'border-t-2 border-white/10' : 'border-t border-white/[0.08]'}`}>
        {/* Timeline */}
        <div className="flex-1 flex items-center gap-3">
          <span className={`text-[10px] text-white/30 uppercase tracking-wider ${designMode === 'boxy' ? 'font-mono' : ''}`}>0:00</span>
          <div className={`flex-1 h-1 bg-white/10 relative ${designMode === 'round' ? 'rounded-full' : ''}`}>
            <div className={`absolute left-0 top-0 h-full w-[30%] bg-white/40 ${designMode === 'round' ? 'rounded-full' : ''}`} />
          </div>
          <span className={`text-[10px] text-white/30 uppercase tracking-wider ${designMode === 'boxy' ? 'font-mono' : ''}`}>0:12</span>
        </div>
        
        {/* Cerebras Branding */}
        <div className="flex items-center gap-3 ml-6">
          <img
            src="/cerebras-logo.svg"
            alt="Cerebras"
            className="w-5 h-5 opacity-70"
          />
          <span className={`text-[10px] text-white/50 uppercase tracking-widest ${designMode === 'boxy' ? 'font-mono' : ''}`}>
            CEREBRAS
          </span>
        </div>
      </footer>
      
    </div>
  );
}
