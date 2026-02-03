import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Agent configuration with emojis as icons for a playful yet professional feel
const AGENTS = [
  { id: "analyst", name: "Analyst", color: "#4ECDC4", icon: "🔍" },
  { id: "optimist", name: "Optimist", color: "#92E849", icon: "✨" },
  { id: "pessimist", name: "Pessimist", color: "#FF985D", icon: "⚠️" },
  { id: "critic", name: "Critic", color: "#FF6B6B", icon: "🎯" },
  { id: "strategist", name: "Strategist", color: "#A876E8", icon: "♟️" },
  { id: "finance", name: "Finance", color: "#7AC4D9", icon: "💰" },
  { id: "risk", name: "Risk", color: "#E85D75", icon: "🛡️" },
  { id: "synthesizer", name: "Synthesizer", color: "#FFFFFF", icon: "🔮" },
];

interface AgentDockProps {
  activeAgentId?: string | null;
  speakingAgentId?: string | null;
  onAgentClick?: (id: string) => void;
}

export function AgentDock({ 
  activeAgentId, 
  speakingAgentId,
  onAgentClick 
}: AgentDockProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          delay: 0.5 
        }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-end gap-1 px-3 py-2 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/50">
          {AGENTS.map((agent, index) => {
            const isActive = activeAgentId === agent.id;
            const isSpeaking = speakingAgentId === agent.id;
            
            return (
              <Tooltip key={agent.id}>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => onAgentClick?.(agent.id)}
                    className={cn(
                      "relative flex items-center justify-center rounded-xl transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cerebras-orange)]",
                      isActive && "bg-white/10"
                    )}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      delay: 0.6 + index * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 20
                    }}
                    whileHover={{ 
                      scale: 1.3,
                      y: -8,
                      transition: { type: "spring", stiffness: 400, damping: 17 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: 44,
                      height: 44,
                    }}
                  >
                    {/* Speaking indicator ring */}
                    {isSpeaking && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          style={{ 
                            border: `2px solid ${agent.color}`,
                          }}
                          animate={{ 
                            scale: [1, 1.3, 1.3],
                            opacity: [0.8, 0, 0]
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            ease: "easeOut"
                          }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          style={{ 
                            border: `2px solid ${agent.color}`,
                          }}
                          animate={{ 
                            scale: [1, 1.5, 1.5],
                            opacity: [0.5, 0, 0]
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: 0.3
                          }}
                        />
                      </>
                    )}

                    {/* Glow effect for speaking agent */}
                    {isSpeaking && (
                      <motion.div
                        className="absolute inset-0 rounded-xl blur-md"
                        style={{ backgroundColor: agent.color }}
                        animate={{ opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}

                    {/* Icon */}
                    <span className="relative text-2xl select-none">
                      {agent.icon}
                    </span>

                    {/* Active dot indicator */}
                    {isActive && !isSpeaking && (
                      <motion.div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ backgroundColor: agent.color }}
                        layoutId="activeDot"
                      />
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  sideOffset={12}
                  className="bg-[#1a1a1a] border-white/10 px-3 py-1.5"
                >
                  <p 
                    className="text-xs font-medium"
                    style={{ color: agent.color }}
                  >
                    {agent.name}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
