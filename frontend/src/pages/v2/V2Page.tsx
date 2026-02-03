import { motion } from "framer-motion";
import { 
  Brain, 
  Sparkles, 
  Layers,
  Zap,
  Network,
  GitBranch
} from "lucide-react";
import { V2Layout } from "@/components/v2/layout";
import { Badge } from "@/components/ui/badge";

// Agent colors matching the design system
const AGENTS = [
  { name: "Analyst", color: "#4ECDC4", icon: "🔍" },
  { name: "Optimist", color: "#92E849", icon: "✨" },
  { name: "Pessimist", color: "#FF985D", icon: "⚠️" },
  { name: "Critic", color: "#FF6B6B", icon: "🎯" },
  { name: "Strategist", color: "#A876E8", icon: "♟️" },
  { name: "Finance", color: "#7AC4D9", icon: "💰" },
  { name: "Risk", color: "#4D1210", icon: "🛡️" },
  { name: "Synthesizer", color: "#FFFFFF", icon: "🔮" },
];

// Placeholder canvas with animated visual
function CanvasPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Animated network visualization placeholder */}
      <div className="relative">
        {/* Central node */}
        <motion.div
          className="relative z-10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-cerebras-orange)]/20 to-[var(--color-mandarin)]/10 border border-[var(--color-border)] flex items-center justify-center backdrop-blur-sm">
            <Brain className="w-10 h-10 text-[var(--color-cerebras-orange)]" />
          </div>
          
          {/* Pulse rings */}
          <motion.div
            className="absolute inset-0 rounded-2xl border border-[var(--color-cerebras-orange)]/30"
            animate={{ 
              scale: [1, 1.5, 1.5],
              opacity: [0.5, 0, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl border border-[var(--color-cerebras-orange)]/20"
            animate={{ 
              scale: [1, 2, 2],
              opacity: [0.3, 0, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5
            }}
          />
        </motion.div>

        {/* Orbiting agent nodes */}
        {AGENTS.map((agent, i) => {
          const angle = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 140;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <motion.div
              key={agent.name}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x,
                y,
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.3 + i * 0.08,
                type: "spring",
                stiffness: 100
              }}
            >
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg cursor-pointer transition-transform hover:scale-110"
                style={{ 
                  backgroundColor: `${agent.color}15`,
                  border: `1px solid ${agent.color}30`,
                }}
                whileHover={{ 
                  boxShadow: `0 0 20px ${agent.color}40`,
                }}
              >
                {agent.icon}
              </motion.div>
              
              {/* Connection line to center */}
              <svg
                className="absolute top-1/2 left-1/2 -z-10 overflow-visible"
                style={{ transform: "translate(-50%, -50%)" }}
              >
                <motion.line
                  x1="0"
                  y1="0"
                  x2={-x}
                  y2={-y}
                  stroke={agent.color}
                  strokeWidth="1"
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                />
              </svg>
            </motion.div>
          );
        })}
      </div>

      {/* Info overlay */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          React Flow Canvas
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-md">
          The multi-agent debate visualization will render here. 
          Enter a topic below to start.
        </p>
        
        {/* Feature badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge 
            variant="outline" 
            className="h-6 gap-1.5 border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/50"
          >
            <Layers className="h-3 w-3 text-[var(--color-cerebras-orange)]" />
            8 Agents
          </Badge>
          <Badge 
            variant="outline" 
            className="h-6 gap-1.5 border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/50"
          >
            <GitBranch className="h-3 w-3 text-[var(--color-purple)]" />
            4 Phases
          </Badge>
          <Badge 
            variant="outline" 
            className="h-6 gap-1.5 border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/50"
          >
            <Zap className="h-3 w-3 text-[var(--color-green)]" />
            Real-time
          </Badge>
          <Badge 
            variant="outline" 
            className="h-6 gap-1.5 border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/50"
          >
            <Network className="h-3 w-3 text-[var(--color-baby-blue)]" />
            Semantic Edges
          </Badge>
        </div>
      </motion.div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[var(--color-text-muted)]" />
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">Canvas ready</span>
      </div>
    </div>
  );
}

// Main V2 Page
export function V2Page() {
  return (
    <V2Layout>
      <CanvasPlaceholder />
    </V2Layout>
  );
}

export default V2Page;
