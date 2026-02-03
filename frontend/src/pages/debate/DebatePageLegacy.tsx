/**
 * LEGACY: Original DebatePage from git history (commit b638457)
 * This is the early prototype version before all the PRD features were implemented.
 * Route: /de
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { DebateCanvas } from '@/components/graph/DebateCanvas';
import { DebateTopBar } from './components/DebateTopBar';
import { DebateTimeline } from './components/DebateTimeline';
import { DebateInput } from './components/DebateInput';
import { InspectorPanel } from './components/InspectorPanel';
import { RainbowMatrixShader } from '@/components/ui/rainbow-matrix-shader';
import { useState } from 'react';
import type { AgentId } from '@/types/agent';

export function DebatePageLegacy() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  // State for the debate
  const [selectedNodeId, setSelectedNodeId] = useState<AgentId | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime] = useState(12); // 12 seconds total debate
  const [tokensPerSecond] = useState(2847);

  const handleNodeSelect = (nodeId: AgentId | null) => {
    setSelectedNodeId(nodeId);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleConstraintSubmit = (constraint: string) => {
    console.log('Constraint submitted:', constraint);
  };

  // If no query, redirect back to home
  if (!query) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/60">No question provided</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Rainbow Matrix Shader Background */}
      <RainbowMatrixShader />

      {/* Legacy Badge */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-mono uppercase tracking-wider">
        Legacy Version — Early Prototype
      </div>

      {/* Main Layout */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Top Bar */}
        <DebateTopBar
          tokensPerSecond={tokensPerSecond}
          isLive={isPlaying}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Canvas Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Question Header */}
            <div className="px-6 pt-4">
              <div className="
                max-w-3xl mx-auto
                px-5 py-3
                rounded-2xl
                backdrop-blur-xl bg-white/[0.03]
                border border-white/[0.08]
                shadow-[0_8px_32px_rgba(0,0,0,0.3)]
              ">
                <p className="text-center text-white/90 font-medium text-lg leading-relaxed">
                  "{query}"
                </p>
              </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 min-h-0">
              <DebateCanvas
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
              />
            </div>
          </div>

          {/* Inspector Panel (Right Sidebar) */}
          <InspectorPanel
            selectedNodeId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>

        {/* Bottom Section */}
        <div className="flex-shrink-0">
          {/* Timeline */}
          <DebateTimeline
            currentTime={currentTime}
            totalTime={totalTime}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
          />

          {/* Input Bar */}
          <DebateInput onSubmit={handleConstraintSubmit} />
        </div>
      </div>
    </div>
  );
}
