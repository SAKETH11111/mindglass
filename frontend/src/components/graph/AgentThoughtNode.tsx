/**
 * AgentThoughtNode - Custom React Flow node for agent thoughts
 * 
 * Features:
 * - Shows thinking content while streaming (real-time feedback)
 * - Collapses thinking when done (shows only answer)
 * - Consistent "done" design style throughout
 * - Tokens per second display
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import { AGENT_NAMES, AGENT_COLORS, type AgentId } from '@/types/agent';

// DiceBear avatar URL generator
const getAvatarUrl = (agentId: AgentId) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${agentId}&backgroundColor=transparent`;

export interface AgentThoughtNodeData extends Record<string, unknown> {
  agentId: AgentId;
  text: string;
  isStreaming: boolean;
  phase: number;
  tokensPerSecond?: number;
}

// Parse <think>...</think> tags and return thinking + answer separately
const parseThinkTags = (input: string): { thinking: string; answer: string; isThinkingComplete: boolean } => {
  if (!input) return { thinking: '', answer: '', isThinkingComplete: false };
  
  // Check for complete <think>...</think> block
  const completeMatch = input.match(/<think>([\s\S]*?)<\/think>/);
  if (completeMatch) {
    const thinking = completeMatch[1].trim();
    const answer = input.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    return { thinking, answer, isThinkingComplete: true };
  }
  
  // Check for incomplete <think> (still streaming thinking)
  const incompleteMatch = input.match(/<think>([\s\S]*)/);
  if (incompleteMatch && !input.includes('</think>')) {
    return { thinking: incompleteMatch[1].trim(), answer: '', isThinkingComplete: false };
  }
  
  // No think tags - just answer
  return { thinking: '', answer: input.trim(), isThinkingComplete: true };
};

function AgentThoughtNodeComponent({ data, selected }: NodeProps) {
  const agentId = data.agentId as AgentId;
  const text = data.text as string;
  const isStreaming = data.isStreaming as boolean;
  const tokensPerSecond = data.tokensPerSecond as number | undefined;
  
  const color = AGENT_COLORS[agentId];
  const name = AGENT_NAMES[agentId];
  
  // Parse thinking and answer
  const { thinking, answer, isThinkingComplete } = parseThinkTags(text);
  
  // Determine what to display
  const isThinking = thinking && !isThinkingComplete;
  const hasThinking = thinking.length > 0;
  const hasAnswer = answer.length > 0;
  
  // For display: show thinking while streaming, then show answer
  let displayContent: string;
  if (isThinking) {
    // Currently thinking - show the thinking content
    displayContent = thinking;
  } else if (hasAnswer) {
    // Thinking done, show answer
    displayContent = answer;
  } else if (isStreaming) {
    // Just started, waiting for content
    displayContent = '';
  } else {
    displayContent = 'Waiting...';
  }
  
  // Truncate for node display (full text available in inspector)
  const truncatedContent = displayContent.length > 200 
    ? displayContent.slice(0, 200) + '...' 
    : displayContent;

  return (
    <div 
      className={`
        relative group cursor-pointer
        min-w-[220px] max-w-[280px]
        bg-[rgba(20,20,20,0.85)] backdrop-blur-xl
        border-2 rounded-xl
        shadow-xl shadow-black/30
        transition-all duration-200
        ${selected ? 'ring-2 ring-white/40 scale-105' : 'hover:scale-[1.02]'}
      `}
      style={{ 
        borderColor: `${color}80`,
      }}
    >
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
        
        {/* Status indicators */}
        <div className="ml-auto flex items-center gap-2">
          {/* Tokens per second */}
          {isStreaming && tokensPerSecond && tokensPerSecond > 0 && (
            <span className="text-[9px] font-mono text-white/40">
              {tokensPerSecond >= 1000 ? `${(tokensPerSecond/1000).toFixed(1)}k` : tokensPerSecond} tok/s
            </span>
          )}
          
          {/* Thinking indicator */}
          {isThinking && (
            <span className="text-[9px] font-mono text-white/50 flex items-center gap-1">
              💭 thinking
              <span className="animate-pulse">▊</span>
            </span>
          )}
          
          {/* Streaming answer indicator */}
          {isStreaming && !isThinking && hasAnswer && (
            <span className="text-[9px] font-mono text-emerald-400/70">
              streaming
            </span>
          )}
          
          {/* Done indicator */}
          {!isStreaming && hasAnswer && (
            <span className="text-[9px] font-mono text-white/30">
              ✓ done
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        {/* Main content - thinking while streaming, answer when done */}
        <div className="prose prose-sm prose-invert max-w-none">
          <div className="text-[11px] leading-[1.5] text-white/70 [&_strong]:text-white [&_strong]:font-semibold [&_em]:text-white/80 [&_ul]:list-disc [&_ul]:ml-3 [&_ol]:list-decimal [&_ol]:ml-3 [&_li]:my-0.5 [&_p]:my-1 [&_h1]:text-xs [&_h1]:font-bold [&_h2]:text-xs [&_h2]:font-semibold [&_h3]:text-[11px] [&_h3]:font-medium [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded">
            {truncatedContent ? (
              <>
                <ReactMarkdown>{truncatedContent}</ReactMarkdown>
                {isStreaming && <span className="ml-0.5">▊</span>}
              </>
            ) : isStreaming ? (
              <span className="text-white/40 italic">Starting...</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Handles for edges */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-2 !h-2 !bg-white/30 !border-0"
      />
    </div>
  );
}

export const AgentThoughtNode = memo(AgentThoughtNodeComponent);
