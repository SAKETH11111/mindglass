import { motion, AnimatePresence } from 'framer-motion';
import { type ReactNode, useState } from 'react';
import { TheaterBackground } from './TheaterBackground';
import { AgentDock } from './AgentDock';
import { FloatingControls } from './FloatingControls';
import { SpotlightPrompt } from './SpotlightPrompt';
import { PhaseTimeline } from './PhaseTimeline';
import type { Phase } from '@/types/agent';

interface V3LayoutProps {
  children?: ReactNode;
}

export function V3Layout({ children }: V3LayoutProps) {
  const [phase, setPhase] = useState<Phase>('dispatch');
  const [selectedAgent, setSelectedAgent] = useState<string | null>('creative');
  const [speakingAgent, setSpeakingAgent] = useState<string | null>('analyst');
  const [zoom, setZoom] = useState(1);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (message: string) => {
    console.log('Submitted:', message);
    setIsProcessing(true);
    setSpeakingAgent('analyst');
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      // Cycle through phases for demo
      const phaseOrder: Phase[] = ['dispatch', 'conflict', 'synthesis', 'convergence'];
      const currentIndex = phaseOrder.indexOf(phase);
      setPhase(phaseOrder[(currentIndex + 1) % phaseOrder.length]);
      // Cycle speaking agent
      const agents = ['analyst', 'optimist', 'pessimist', 'critic', 'strategist', 'finance', 'risk', 'synthesizer'];
      const agentIndex = agents.indexOf(speakingAgent || 'analyst');
      setSpeakingAgent(agents[(agentIndex + 1) % agents.length]);
    }, 2000);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Theatrical background */}
      <TheaterBackground phase={phase} />

      {/* Phase timeline at top */}
      <PhaseTimeline currentPhase={phase} progress={0.6} />

      {/* Main canvas area */}
      <motion.main
        className="absolute inset-0 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Canvas content */}
        <AnimatePresence mode="wait">
          {children || (
            <motion.div
              key="placeholder"
              className="flex h-full w-full items-center justify-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* Elegant placeholder */}
              <div className="text-center">
                <motion.div
                  className="mb-6 text-6xl"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  🧠
                </motion.div>
                <motion.h2
                  className="mb-2 text-2xl font-light tracking-tight text-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Multi-Agent Debate Canvas
                </motion.h2>
                <motion.p
                  className="text-sm text-zinc-500"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Enter a prompt below to start the discussion
                </motion.p>

                {/* Demo phase switcher */}
                <motion.div
                  className="mt-8 flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {(['idle', 'dispatch', 'conflict', 'synthesis', 'convergence'] as Phase[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPhase(p)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                        phase === p
                          ? 'bg-white/10 text-white'
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Floating controls - right side */}
      <FloatingControls
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.1, 2))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
        onFitView={() => setZoom(1)}
        minimapVisible={minimapVisible}
        onToggleMinimap={() => setMinimapVisible(!minimapVisible)}
      />

      {/* Spotlight prompt - centered bottom */}
      <SpotlightPrompt
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        placeholder="Describe what you want the agents to debate..."
      />

      {/* Agent dock - bottom center */}
      <AgentDock
        activeAgentId={selectedAgent}
        speakingAgentId={speakingAgent}
        onAgentClick={setSelectedAgent}
      />

      {/* Subtle branding */}
      <motion.div
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div 
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: '#F15A29' }}
        />
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Powered by Cerebras
        </span>
      </motion.div>
    </div>
  );
}
