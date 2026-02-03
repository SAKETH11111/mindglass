import { motion } from "framer-motion";
import { 
  Zap, 
  Users, 
  Clock, 
  Hash,
  Circle,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Phase definitions matching backend
const PHASES = {
  IDLE: { label: "Idle", color: "var(--color-text-muted)" },
  DISPATCH: { label: "Dispatch", color: "var(--color-cerebras-orange)" },
  CONFLICT: { label: "Conflict", color: "var(--color-mandarin)" },
  SYNTHESIS: { label: "Synthesis", color: "var(--color-purple)" },
  CONVERGENCE: { label: "Convergence", color: "var(--color-green)" },
} as const;

type PhaseKey = keyof typeof PHASES;

interface StatusBarProps {
  phase?: PhaseKey;
  activeAgents?: number;
  totalAgents?: number;
  tokens?: number;
  latency?: number;
  isRunning?: boolean;
  onPlayPause?: () => void;
  onReset?: () => void;
}

export function StatusBar({
  phase = "IDLE",
  activeAgents = 0,
  totalAgents = 8,
  tokens = 0,
  latency = 0,
  isRunning = false,
  onPlayPause,
  onReset,
}: StatusBarProps) {
  const currentPhase = PHASES[phase];

  return (
    <TooltipProvider delayDuration={300}>
      <footer className="h-8 flex items-center justify-between px-3 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 backdrop-blur-xl shrink-0 text-[11px]">
        {/* Left: Phase indicator */}
        <div className="flex items-center gap-3">
          {/* Phase badge */}
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={phase !== "IDLE" ? { 
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7] 
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Circle 
                className="h-2 w-2" 
                fill={currentPhase.color}
                style={{ color: currentPhase.color }}
              />
            </motion.div>
            <span 
              className="font-medium uppercase tracking-wider"
              style={{ color: currentPhase.color }}
            >
              {currentPhase.label}
            </span>
          </div>

          <Separator orientation="vertical" className="h-4 bg-[var(--color-border)]" />

          {/* Agent count */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Users className="h-3 w-3" />
                <span>
                  <span className="text-[var(--color-text-secondary)] font-medium">{activeAgents}</span>
                  <span className="opacity-50">/{totalAgents}</span>
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">{activeAgents} active agents of {totalAgents}</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 bg-[var(--color-border)]" />

          {/* Token count */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Hash className="h-3 w-3" />
                <span className="text-[var(--color-text-secondary)] font-medium">
                  {tokens.toLocaleString()}
                </span>
                <span className="opacity-50 hidden sm:inline">tokens</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">{tokens.toLocaleString()} tokens generated</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 bg-[var(--color-border)]" />

          {/* Latency */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Clock className="h-3 w-3" />
                <span className="text-[var(--color-text-secondary)] font-medium">
                  {latency}
                </span>
                <span className="opacity-50">ms</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">Response latency</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Center: Cerebras branding */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[var(--color-text-muted)]">
          <Zap className="h-3 w-3 text-[var(--color-cerebras-orange)]" />
          <span className="hidden sm:inline">Powered by</span>
          <span className="font-semibold text-[var(--color-text-secondary)]">Cerebras</span>
        </div>

        {/* Right: Run controls */}
        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onPlayPause}
                className="h-6 w-6 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                {isRunning ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">{isRunning ? "Pause" : "Resume"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Reset */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="h-6 w-6 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">Reset debate</p>
            </TooltipContent>
          </Tooltip>

          {/* Version badge */}
          <Badge 
            variant="outline" 
            className="ml-2 h-5 px-1.5 text-[9px] font-mono border-[var(--color-border)] text-[var(--color-text-muted)] bg-transparent"
          >
            v0.1.0
          </Badge>
        </div>
      </footer>
    </TooltipProvider>
  );
}
