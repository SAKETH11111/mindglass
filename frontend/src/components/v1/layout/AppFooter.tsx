import { motion } from "framer-motion";
import { Zap, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AppFooterProps {
  status?: "ready" | "connecting" | "streaming" | "thinking" | "error";
}

const statusConfig = {
  ready: {
    label: "Ready",
    color: "var(--color-green)",
    icon: Wifi,
    pulse: false,
  },
  connecting: {
    label: "Connecting",
    color: "var(--color-mandarin)",
    icon: Wifi,
    pulse: true,
  },
  streaming: {
    label: "Streaming",
    color: "var(--color-cerebras-orange)",
    icon: Zap,
    pulse: true,
  },
  thinking: {
    label: "Thinking",
    color: "var(--color-mandarin)",
    icon: Zap,
    pulse: true,
  },
  error: {
    label: "Disconnected",
    color: "#EF4444",
    icon: WifiOff,
    pulse: false,
  },
};

export function AppFooter({ status = "ready" }: AppFooterProps) {
  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <footer className="relative h-10 shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
      {/* Die-cut corner decorations */}
      <div className="absolute left-0 bottom-0 w-2 h-2 border-l-2 border-b-2 border-[var(--color-border)] rounded-bl-sm" />
      <div className="absolute right-0 bottom-0 w-2 h-2 border-r-2 border-b-2 border-[var(--color-border)] rounded-br-sm" />

      <div className="flex h-full items-center justify-between px-4">
        {/* Left: Powered by Cerebras */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <motion.div
            className="flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span 
              className="inline-block w-1.5 h-1.5 rounded-full" 
              style={{ backgroundColor: "var(--color-cerebras-orange)" }}
            />
            <span className="font-medium">Powered by</span>
            <span className="font-semibold text-[var(--color-text-secondary)]">
              Cerebras
            </span>
          </motion.div>
          
          <span className="text-[var(--color-border)]">•</span>
          
          <span className="hidden sm:inline opacity-60">
            Wafer-Scale AI Inference
          </span>
        </div>

        {/* Center: Version or info (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
          <span className="opacity-60">v0.1.0</span>
          <span className="opacity-40">•</span>
          <span className="opacity-60">8 Agents</span>
          <span className="opacity-40">•</span>
          <span className="opacity-60">4 Phases</span>
        </div>

        {/* Right: Status indicator */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="h-6 gap-1.5 px-2 text-[10px] font-medium border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          >
            <motion.div
              className="relative"
              animate={currentStatus.pulse ? { 
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1] 
              } : {}}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <StatusIcon 
                className="h-3 w-3" 
                style={{ color: currentStatus.color }}
              />
              {currentStatus.pulse && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: currentStatus.color }}
                  animate={{ 
                    scale: [1, 2],
                    opacity: [0.4, 0] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeOut" 
                  }}
                />
              )}
            </motion.div>
            <span style={{ color: currentStatus.color }}>
              {currentStatus.label}
            </span>
          </Badge>
        </div>
      </div>
    </footer>
  );
}
