import { useRef, useEffect, useMemo } from 'react';
import { useDebateStore } from '@/hooks/useDebateStore';
import { AGENT_COLORS, AGENT_NAMES } from '@/types/agent';
import type { AgentId } from '@/types/agent';

export function AgentResponse() {
  const agents = useDebateStore((state) => state.agents);
  const isDebating = useDebateStore((state) => state.isDebating);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find the currently streaming or most recently active agent
  const activeAgent = useMemo(() => {
    const agentList = Object.values(agents);
    // First try to find a streaming agent
    const streaming = agentList.find((a) => a.isStreaming);
    if (streaming) return streaming;
    // Otherwise find any active agent with text
    return agentList.find((a) => a.isActive && a.text);
  }, [agents]);

  // Auto-scroll to bottom as text appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeAgent?.text]);

  if (!activeAgent || (!activeAgent.text && !isDebating)) {
    return null;
  }

  const agentId = activeAgent.id as AgentId;
  const agentColor = AGENT_COLORS[agentId];
  const agentName = AGENT_NAMES[agentId];
  const isStreaming = activeAgent.isStreaming;
  const agentText = activeAgent.text;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Agent header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: agentColor }}
        />
        <span
          className="font-semibold text-sm uppercase tracking-wider"
          style={{ color: agentColor }}
        >
          {agentName}
        </span>
        {isStreaming && (
          <span className="text-text-muted text-xs animate-pulse">
            typing...
          </span>
        )}
      </div>

      {/* Response container */}
      <div
        ref={scrollRef}
        className="glass rounded-2xl p-6 min-h-[120px] max-h-[400px] overflow-y-auto
                   scrollbar-thin scrollbar-thumb-text-muted/30 scrollbar-track-transparent"
      >
        <p className="text-text-primary leading-relaxed whitespace-pre-wrap font-mono text-sm">
          {agentText}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-coral ml-1 animate-pulse" />
          )}
        </p>
      </div>

      {/* Token count */}
      {agentText.length > 0 && (
        <div className="flex justify-end mt-2">
          <span className="text-text-muted text-xs">
            {agentText.length} characters
            {isStreaming && ' • streaming'}
          </span>
        </div>
      )}
    </div>
  );
}
