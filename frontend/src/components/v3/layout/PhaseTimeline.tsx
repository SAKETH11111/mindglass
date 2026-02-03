import { motion } from 'framer-motion';
import type { Phase } from '@/types/agent';

interface PhaseTimelineProps {
  currentPhase?: Phase;
  progress?: number; // 0-1 within current phase
}

const phases: { id: Phase; label: string; icon: string }[] = [
  { id: 'dispatch', label: 'Dispatch', icon: '🚀' },
  { id: 'conflict', label: 'Conflict', icon: '⚔️' },
  { id: 'synthesis', label: 'Synthesis', icon: '🔮' },
  { id: 'convergence', label: 'Convergence', icon: '✨' },
];

const phaseColors: Record<Phase, string> = {
  idle: 'rgb(113, 113, 122)',
  dispatch: 'rgb(59, 130, 246)',
  conflict: 'rgb(239, 68, 68)',
  synthesis: 'rgb(168, 85, 247)',
  convergence: 'rgb(34, 197, 94)',
  complete: 'rgb(34, 197, 94)',
};

export function PhaseTimeline({
  currentPhase = 'idle',
  progress = 0,
}: PhaseTimelineProps) {
  const currentIndex = phases.findIndex((p) => p.id === currentPhase);
  const isActive = currentPhase !== 'idle' && currentPhase !== 'complete';

  return (
    <motion.div
      className="fixed left-1/2 top-6 z-40 -translate-x-1/2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Glass container */}
      <div 
        className="relative overflow-hidden rounded-full"
        style={{
          boxShadow: '0 15px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-xl" />
        
        {/* Content */}
        <div className="relative flex items-center gap-1 px-2 py-1.5">
          {phases.map((phase, index) => {
            const isCompleted = currentIndex > index;
            const isCurrent = currentIndex === index;
            const isPending = currentIndex < index;

            return (
              <div key={phase.id} className="flex items-center">
                {/* Phase node */}
                <motion.div
                  className="relative flex items-center gap-2 rounded-full px-3 py-1.5"
                  animate={{
                    backgroundColor: isCurrent
                      ? `${phaseColors[phase.id]}20`
                      : 'transparent',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Icon */}
                  <motion.span
                    className="text-sm"
                    animate={{
                      scale: isCurrent ? 1.2 : 1,
                      filter: isPending ? 'grayscale(1)' : 'grayscale(0)',
                      opacity: isPending ? 0.4 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {phase.icon}
                  </motion.span>

                  {/* Label - only show for current */}
                  <motion.span
                    className="text-xs font-medium"
                    animate={{
                      color: isCurrent
                        ? phaseColors[phase.id]
                        : isCompleted
                          ? 'rgb(161, 161, 170)'
                          : 'rgb(82, 82, 91)',
                      opacity: isCurrent ? 1 : isCompleted ? 0.8 : 0.4,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {phase.label}
                  </motion.span>

                  {/* Active pulse */}
                  {isCurrent && isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `1px solid ${phaseColors[phase.id]}`,
                      }}
                      animate={{
                        opacity: [0.5, 0, 0.5],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}

                  {/* Progress indicator for current phase */}
                  {isCurrent && progress > 0 && (
                    <motion.div
                      className="absolute bottom-0 left-3 right-3 h-0.5 overflow-hidden rounded-full bg-white/10"
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: phaseColors[phase.id] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.div>
                  )}
                </motion.div>

                {/* Connector */}
                {index < phases.length - 1 && (
                  <div className="relative mx-1 h-0.5 w-6 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        backgroundColor: isCompleted
                          ? phaseColors[phases[index + 1].id]
                          : 'transparent',
                      }}
                      animate={{
                        width: isCompleted ? '100%' : isCurrent ? `${progress * 100}%` : '0%',
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle glow for active state */}
      {isActive && (
        <motion.div
          className="pointer-events-none absolute -inset-4"
          animate={{
            background: `radial-gradient(ellipse at center, ${phaseColors[currentPhase]}20 0%, transparent 70%)`,
          }}
          style={{ filter: 'blur(20px)', zIndex: -1 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.div>
  );
}
