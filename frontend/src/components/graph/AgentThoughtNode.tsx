/**
 * AgentThoughtNode - Custom React Flow node for agent thoughts
 * 
 * Glassmorphic card with:
 * - Agent avatar + name header
 * - Streaming text content (truncated with "...")
 * - Colored border based on agent
 * - Pulsing indicator when streaming
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';

// DiceBear avatar URL generator
const getAvatarUrl = (agentId: AgentId) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${agentId}&backgroundColor=transparent`;

export interface AgentThoughtNodeData extends Record<string, unknown> {
  agentId: AgentId;
  text: string;
  isStreaming: boolean;
  phase: number;
}

function AgentThoughtNodeComponent({ data, selected }: NodeProps) {
  const agentId = data.agentId as AgentId;
  const text = data.text as string;
  const isStreaming = data.isStreaming as boolean;
  
  const color = AGENT_COLORS[agentId];
  const name = AGENT_NAMES[agentId];
  
  // Strip think tags - handle both complete and incomplete (streaming) tags
  const stripThinkTags = (input: string): string => {
    if (!input) return '';
    // Remove complete <think>...</think> blocks
    let cleaned = input.replace(/<think>[\s\S]*?<\/think>/g, '');
    // Remove incomplete <think> without closing tag (during streaming)
    cleaned = cleaned.replace(/<think>[\s\S]*/g, '');
    // Remove any stray closing tags
    cleaned = cleaned.replace(/<\/think>/g, '');
    return cleaned.trim();
  };
  
  const cleanText = stripThinkTags(text);
  
  // Truncate for node display (full text in inspector)
  const displayText = cleanText.length > 180 
    ? cleanText.slice(0, 180) + '...' 
    : cleanText || (isStreaming ? 'Thinking...' : 'Waiting...');

  return (
    <div 
      className={`
        relative group
        min-w-[220px] max-w-[280px]
        bg-[rgba(20,20,20,0.85)] backdrop-blur-xl
        border-2 rounded-xl
        shadow-xl shadow-black/30
        transition-all duration-200
        ${selected ? 'ring-2 ring-white/40 scale-105' : 'hover:scale-[1.02]'}
        ${isStreaming ? 'animate-pulse' : ''}
      `}
      style={{ 
        borderColor: isStreaming ? color : `${color}80`,
      }}
    >
      {/* Glow effect when streaming */}
      {isStreaming && (
        <div 
          className="absolute inset-0 rounded-xl blur-xl opacity-30 -z-10"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Header */}
      <div 
        className="flex items-center gap-2.5 px-3 py-2 border-b border-white/10"
        style={{ backgroundColor: `${color}15` }}
      >
        <div 
          className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          <img 
            src={getAvatarUrl(agentId)} 
            alt={name} 
            className="w-full h-full"
            draggable={false}
          />
        </div>
        <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
          {name}
        </span>
        {isStreaming && (
          <div 
            className="w-2 h-2 rounded-full ml-auto animate-pulse"
            style={{ backgroundColor: color }}
          />
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] leading-[1.5] text-white/70 font-mono">
          {displayText}
          {isStreaming && <span className="animate-pulse ml-0.5">▊</span>}
        </p>
      </div>

      {/* Handles for edges */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
    </div>
  );
}

export const AgentThoughtNode = memo(AgentThoughtNodeComponent);
