import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface AgentNodeData {
  agentId: string;
  name: string;
  color: string;
  avatar: string;
  text: string;
  isStreaming: boolean;
  isSelected: boolean;
}

export const AgentNode = memo(function AgentNode({ data }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const { name, color, avatar, text, isStreaming, isSelected } = nodeData;
  
  // Truncate text for preview
  const previewText = text.length > 120 ? text.slice(0, 120) + '...' : text;
  
  return (
    <>
      {/* Invisible handles for edges */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      
      <div 
        className={`
          relative
          w-64
          rounded-2xl
          overflow-hidden
          transition-all duration-300 ease-out
          cursor-pointer
          group
          
          /* Glassmorphism */
          backdrop-blur-xl
          bg-gradient-to-br from-white/[0.08] to-white/[0.02]
          border border-white/[0.12]
          
          /* Shadow & Depth */
          shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
          
          /* Hover & Selection states */
          ${isSelected 
            ? 'ring-2 ring-white/40 scale-[1.02] shadow-[0_12px_48px_rgba(0,0,0,0.5)]' 
            : 'hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]'
          }
          
          /* Streaming glow */
          ${isStreaming 
            ? 'animate-pulse ring-2' 
            : ''
          }
        `}
        style={{
          // Dynamic glow based on agent color when streaming or selected
          boxShadow: isSelected || isStreaming 
            ? `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${color}30`
            : undefined,
        }}
      >
        {/* Colored accent line at top */}
        <div 
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
        />
        
        {/* Content */}
        <div className="p-4">
          {/* Header: Avatar + Name */}
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <div 
              className="
                w-10 h-10 
                rounded-xl 
                overflow-hidden
                border border-white/10
                bg-white/5
                flex-shrink-0
              "
              style={{
                boxShadow: `0 0 16px ${color}20`,
              }}
            >
              <img 
                src={avatar} 
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Name + Status */}
            <div className="flex-1 min-w-0">
              <h3 
                className="text-sm font-semibold text-white/90 truncate"
                style={{ textShadow: `0 0 20px ${color}40` }}
              >
                {name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isStreaming ? (
                  <>
                    <span 
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">
                      Thinking...
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">
                    Complete
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Response Preview */}
          <p className="
            text-xs text-white/60 
            leading-relaxed
            font-mono
            line-clamp-4
          ">
            {previewText}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-white/60 animate-blink" />
            )}
          </p>
        </div>
        
        {/* Subtle inner glow at bottom for depth */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${color}08, transparent)`,
          }}
        />
      </div>
    </>
  );
});
