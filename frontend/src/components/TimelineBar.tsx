/**
 * TimelineBar - Full-width timeline with clickable checkpoints
 * 
 * Features:
 * - Takes up the whole bottom space
 * - Shows checkpoints as clickable dots
 * - Clicking a checkpoint jumps to that point in the debate
 * - Shows agent names/round names on hover
 * - Progress bar shows elapsed time
 */

import { useMemo } from 'react';
import { useDebateStore, type Checkpoint } from '@/hooks/useDebateStore';
import { AGENT_COLORS, type AgentId } from '@/types/agent';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimelineBarProps {
  elapsedMs: number;
  designMode?: 'boxy' | 'round';
  currentTps?: number;
}

export function TimelineBar({
  elapsedMs,
  designMode = 'boxy',
  currentTps: propTps = 0
}: TimelineBarProps) {
  const checkpoints = useDebateStore((state) => state.checkpoints);
  const activeCheckpointIndex = useDebateStore((state) => state.activeCheckpointIndex);
  const debateStartTime = useDebateStore((state) => state.debateStartTime);
  const globalTps = useDebateStore((state) => state.tokensPerSecond);
  const benchmarkReport = useDebateStore((state) => state.benchmarkReport);
  const phase = useDebateStore((state) => state.phase);
  const isDebating = useDebateStore((state) => state.isDebating);
  const agents = useDebateStore((state) => state.agents);
  const jumpToCheckpoint = useDebateStore((state) => state.jumpToCheckpoint);

  // Use prop TPS if available (from agent metrics), otherwise fall back to global simulated TPS
  const currentTps = propTps > 0 ? propTps : globalTps;
  const exitTimeTravel = useDebateStore((state) => state.exitTimeTravel);

  // Calculate max duration dynamically from last checkpoint or elapsed time
  const lastCheckpointTime = checkpoints.length > 0
    ? checkpoints[checkpoints.length - 1].timestamp
    : 0;
  const maxDurationMs = Math.max(elapsedMs, lastCheckpointTime, 1);
  const expectedDurationMs = benchmarkReport?.e2eMs ?? 18000;
  const phaseFloor = (() => {
    switch (phase) {
      case 'Opening Arguments':
        return 0.1;
      case 'Challenge':
        return 0.32;
      case 'Defense & Rebuttal':
        return 0.56;
      case 'Expert Analysis':
        return 0.78;
      case 'Final Verdict':
        return 0.92;
      case 'complete':
        return 1;
      default:
        return 0;
    }
  })();

  // Calculate progress percentage
  const progress = isDebating
    ? Math.min(Math.max(phaseFloor, elapsedMs / expectedDurationMs), 0.99) * 100
    : Math.min((elapsedMs / maxDurationMs) * 100, 100);

  // Format time display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate checkpoint positions on the timeline
  const checkpointPositions = useMemo(() => {
    if (!debateStartTime || checkpoints.length === 0) return [];

    return checkpoints.map((checkpoint, index) => {
      const positionPercent = Math.min((checkpoint.timestamp / maxDurationMs) * 100, 100);
      return {
        ...checkpoint,
        index,
        positionPercent,
      };
    });
  }, [checkpoints, debateStartTime, maxDurationMs]);

  const isTimeTraveling = activeCheckpointIndex !== null;
  const activeAgents = Object.values(agents).filter((agent) => agent.isStreaming);
  const answeredAgents = Object.values(agents).filter((agent) => agent.text.trim().length > 0).length;
  const liveStatus = isDebating
    ? (
      answeredAgents === 0
        ? `${phase === 'idle' ? 'Preparing session' : phase} • waiting for the first perspective`
        : `${phase === 'idle' ? 'Streaming' : phase} • ${activeAgents.length || 1} perspective${activeAgents.length === 1 ? '' : 's'} active`
    )
    : null;

  // Get checkpoint color based on type
  const getCheckpointColor = (checkpoint: Checkpoint): string => {
    if (checkpoint.type === 'agent_done' && checkpoint.agentId) {
      return AGENT_COLORS[checkpoint.agentId as AgentId];
    }
    if (checkpoint.type === 'constraint') {
      return '#888888'; // Gray for user constraints
    }
    return '#ffffff';
  };

  return (
    <div className={`w-full bg-[#0a0a0a] ${designMode === 'boxy' ? 'border-t-2 border-white/10' : 'border-t border-white/[0.06]'}`}>
      {/* Time travel indicator */}
      {isTimeTraveling && (
        <div className="h-8 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between px-4">
          <span className={`text-xs text-amber-400 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}>
            Viewing Snapshot: {checkpoints[activeCheckpointIndex]?.label}
          </span>
          <button
            onClick={exitTimeTravel}
            className={`text-xs text-amber-400 hover:text-amber-300 transition-colors ${designMode === 'boxy' ? 'font-mono uppercase' : ''}`}
          >
            {designMode === 'boxy' ? 'RETURN TO LIVE' : 'Return to live'}
          </button>
        </div>
      )}

      {/* Main timeline */}
      <div className="h-12 px-6 flex items-center gap-4">
        {/* Current time */}
        <span className={`text-xs text-white/40 tabular-nums w-10 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
          {formatTime(elapsedMs)}
        </span>

        {/* Timeline track */}
        <div className="flex-1 relative h-8 flex items-center">
          {/* Background track */}
          <div className={`absolute inset-x-0 h-1 bg-white/[0.06] ${designMode === 'round' ? 'rounded-full' : ''}`} />
          
          {/* Progress bar */}
          <div
            className={`absolute left-0 h-1 bg-gradient-to-r from-[#F15A29]/80 to-[#F15A29]/40 transition-all duration-100 ${designMode === 'round' ? 'rounded-full' : ''}`}
            style={{ width: `${progress}%` }}
          />
          {isDebating && (
            <div
              className={`absolute left-0 h-1 overflow-hidden ${designMode === 'round' ? 'rounded-full' : ''}`}
              style={{ width: `${Math.max(progress, 8)}%` }}
            >
              <div className="h-full w-full animate-pulse bg-[linear-gradient(90deg,rgba(241,90,41,0.18)_0%,rgba(241,90,41,0.5)_50%,rgba(241,90,41,0.18)_100%)]" />
            </div>
          )}

          {/* Checkpoint dots */}
          {checkpointPositions.map((checkpoint) => (
            <button
              key={checkpoint.id}
              onClick={() => jumpToCheckpoint(checkpoint.index)}
              className="absolute transform -translate-x-1/2 group z-10"
              style={{ left: `${checkpoint.positionPercent}%` }}
            >
              {/* Dot */}
              <div
                className={`
                  w-3 h-3 border-2 border-[#0a0a0a] transition-all duration-150
                  ${activeCheckpointIndex === checkpoint.index ? 'scale-150 ring-2 ring-white/30' : 'hover:scale-125'}
                  ${designMode === 'round' ? 'rounded-full' : ''}
                `}
                style={{ backgroundColor: getCheckpointColor(checkpoint) }}
              />
              
              {/* Tooltip */}
              <div
                className={`
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  px-2 py-1 text-[10px] whitespace-nowrap
                  bg-[#1a1a1a] border border-white/10 text-white/80
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                  ${designMode === 'round' ? 'rounded-lg' : ''}
                  ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}
                `}
              >
                {checkpoint.label}
                <div className="text-white/40 text-[9px]">
                  {formatTime(checkpoint.timestamp)}
                </div>
              </div>
            </button>
          ))}

          {/* Playhead (current position) */}
          {!isTimeTraveling && (
            <div
              className="absolute transform -translate-x-1/2 z-20"
              style={{ left: `${progress}%` }}
            >
              <div className={`w-3 h-3 bg-white border-2 border-[#0a0a0a] ${designMode === 'round' ? 'rounded-full' : ''}`} />
            </div>
          )}
        </div>

        {/* Max time */}
        <span className={`text-xs text-white/40 tabular-nums w-10 ${designMode === 'boxy' ? 'font-mono' : ''}`}>
          {formatTime(isDebating ? expectedDurationMs : maxDurationMs)}
        </span>

        {/* TPS Counter */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-1 bg-white/[0.03] border border-white/5 cursor-help">
                <div className={`w-1.5 h-1.5 rounded-full ${currentTps > 0 ? 'bg-[#F15A29] animate-pulse' : 'bg-white/20'}`} />
                <span className="text-[9px] text-white/35 font-mono uppercase tracking-wider hidden sm:inline">Rate</span>
                <span className={`text-[10px] font-mono font-medium tabular-nums ${currentTps > 0 ? 'text-[#F15A29]' : 'text-white/30'}`}>
                  {currentTps > 0 ? `${Math.round(currentTps).toLocaleString()}` : '--'}
                </span>
                <span className="text-[9px] text-white/40 font-mono">tok/s</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-[#0a0a0a] border border-white/10 text-white">
              <p className="text-[11px] font-mono text-white/80">
                Live throughput aggregated across the active perspectives.
              </p>
              <p className="text-[10px] font-mono text-white/50 mt-1">
                Detailed timing moves into run details after the session completes.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Run Summary */}
      <div className={`h-8 px-6 flex items-center justify-between border-t ${designMode === 'boxy' ? 'border-white/5' : 'border-white/[0.03]'}`}>
        <div className="flex items-center gap-4 min-w-0">
          {liveStatus && (
            <span className="truncate text-[10px] font-mono text-[#F15A29]/80">
              {liveStatus}
            </span>
          )}
          {checkpoints.length > 0 && (
            <span className={`text-[10px] text-white/30 ${designMode === 'boxy' ? 'font-mono uppercase tracking-wider' : ''}`}>
              {checkpoints.length} {designMode === 'boxy' ? 'SNAPSHOTS' : 'snapshots'}
            </span>
          )}
        </div>

        {benchmarkReport ? (
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-white/35">End to End</span>
            <span className="text-white/70">{(benchmarkReport.e2eMs / 1000).toFixed(2)}s</span>
            <span className="text-white/20">•</span>
            <span className="text-white/35">First Response</span>
            <span className="text-white/70">
              {benchmarkReport.firstTokenMs !== null ? `${benchmarkReport.firstTokenMs}ms` : '--'}
            </span>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-white/30">
            {isDebating ? 'Live progress is estimated until the first checkpoints land.' : 'Run details appear once the session settles.'}
          </div>
        )}
      </div>
    </div>
  );
}
