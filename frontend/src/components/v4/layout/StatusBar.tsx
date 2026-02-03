import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock,
  Activity,
  Cpu,
} from 'lucide-react';
import type { Phase } from '@/types/agent';

interface StatusBarProps {
  className?: string;
  phase?: Phase;
  agentCount?: number;
  activeAgents?: number;
  tokensUsed?: number;
  latencyMs?: number;
  isRunning?: boolean;
  onPlayPause?: () => void;
  onReset?: () => void;
}

const phaseLabels: Record<Phase, string> = {
  idle: 'Ready',
  dispatch: 'Dispatching',
  conflict: 'Debating',
  synthesis: 'Synthesizing',
  convergence: 'Converging',
  complete: 'Complete',
};

const phaseColors: Record<Phase, string> = {
  idle: '#71717a',
  dispatch: '#3b82f6',
  conflict: '#ef4444',
  synthesis: '#a855f7',
  convergence: '#22c55e',
  complete: '#22c55e',
};

export function StatusBar({
  className,
  phase = 'idle',
  agentCount = 8,
  activeAgents = 0,
  tokensUsed = 0,
  latencyMs = 0,
  isRunning = false,
  onPlayPause,
  onReset,
}: StatusBarProps) {
  return (
    <motion.footer
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'flex h-8 items-center justify-between px-4',
        'border-t border-zinc-800/50',
        'bg-zinc-950/80 backdrop-blur-xl',
        className
      )}
      initial={{ y: 32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
    >
      {/* Left: Phase + Agents */}
      <div className="flex items-center gap-4">
        {/* Phase indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: phaseColors[phase] }}
            animate={phase !== 'idle' && phase !== 'complete' ? {
              scale: [1, 1.2, 1],
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              className="text-xs font-medium"
              style={{ color: phaseColors[phase] }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {phaseLabels[phase]}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Separator */}
        <div className="h-3 w-px bg-zinc-800" />

        {/* Agent count */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Activity className="h-3.5 w-3.5" />
          <span>
            <span className="text-zinc-300">{activeAgents}</span>
            <span className="text-zinc-600">/{agentCount}</span>
            <span className="ml-1">agents</span>
          </span>
        </div>
      </div>

      {/* Center: Controls */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
        <button
          onClick={onReset}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onPlayPause}
          className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-white transition-colors hover:bg-zinc-700"
        >
          {isRunning ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-0.5" />
          )}
        </button>
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-4">
        {/* Tokens */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Cpu className="h-3.5 w-3.5" />
          <span>
            <span className="text-zinc-300">{tokensUsed.toLocaleString()}</span>
            <span className="ml-1">tokens</span>
          </span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          <span>
            <span className="text-zinc-300">{latencyMs}</span>
            <span className="ml-0.5">ms</span>
          </span>
        </div>
      </div>
    </motion.footer>
  );
}
