import { type ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { PromptInput } from './PromptInput';
import type { Phase } from '@/types/agent';

interface V4LayoutProps {
  children?: ReactNode;
}

export function V4Layout({ children }: V4LayoutProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgents, setActiveAgents] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);

  const handleSubmit = (message: string) => {
    console.log('Debate prompt:', message);
    setIsProcessing(true);
    setIsRunning(true);
    setPhase('dispatch');
    setActiveAgents(1);

    // Simulate phase progression
    const phases: Phase[] = ['dispatch', 'conflict', 'synthesis', 'convergence', 'complete'];
    let phaseIndex = 0;

    const interval = setInterval(() => {
      phaseIndex++;
      if (phaseIndex < phases.length) {
        setPhase(phases[phaseIndex]);
        setActiveAgents(Math.min(phaseIndex + 2, 8));
        setTokensUsed((prev) => prev + Math.floor(Math.random() * 500) + 200);
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        setIsRunning(false);
      }
    }, 2000);
  };

  const handleStop = () => {
    setIsProcessing(false);
    setIsRunning(false);
    setPhase('idle');
    setActiveAgents(0);
  };

  const handleReset = () => {
    setPhase('idle');
    setIsRunning(false);
    setIsProcessing(false);
    setActiveAgents(0);
    setTokensUsed(0);
  };

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Subtle grid pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top bar */}
      <TopBar 
        connectionStatus={isProcessing ? 'connecting' : 'connected'}
      />

      {/* Main canvas area */}
      <motion.main
        className="absolute inset-0 pt-12 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {children || (
          <div className="flex h-full w-full items-center justify-center">
            {/* Placeholder state */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              {/* Icon */}
              <motion.div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900"
                animate={isProcessing ? { 
                  borderColor: ['rgba(241,90,41,0.3)', 'rgba(241,90,41,0.6)', 'rgba(241,90,41,0.3)'],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-2xl">🧠</span>
              </motion.div>

              {/* Title */}
              <h1 className="mb-2 text-xl font-medium text-white">
                Multi-Agent Debate
              </h1>
              
              {/* Description */}
              <p className="mb-8 max-w-sm text-sm text-zinc-500">
                Enter a topic below and watch 8 specialized AI agents 
                analyze, debate, and synthesize insights in real-time.
              </p>

              {/* Demo phase buttons */}
              <div className="flex items-center justify-center gap-2">
                {(['idle', 'dispatch', 'conflict', 'synthesis', 'convergence', 'complete'] as Phase[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPhase(p)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                      phase === p
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </motion.main>

      {/* Prompt input */}
      <PromptInput
        onSubmit={handleSubmit}
        onStop={handleStop}
        isProcessing={isProcessing}
      />

      {/* Status bar */}
      <StatusBar
        phase={phase}
        activeAgents={activeAgents}
        tokensUsed={tokensUsed}
        latencyMs={isProcessing ? Math.floor(Math.random() * 50) + 20 : 0}
        isRunning={isRunning}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
      />
    </div>
  );
}
