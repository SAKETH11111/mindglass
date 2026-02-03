/**
 * UserProxyNode - Visual representation of user interrupt/constraint
 *
 * PRD Spec: Gray node with hexagonal border that spawns when user
 * interrupts the debate. Connected to all active agents.
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface UserProxyNodeData {
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

export const UserProxyNode = memo(({ data }: NodeProps<UserProxyNodeData>) => {
  return (
    <div className="relative">
      {/* Hexagon shape using clip-path */}
      <div
        className={`
          relative px-6 py-4 min-w-[200px] max-w-[320px]
          bg-[#1a1a1a] border-2 border-[#888888]
          transition-all duration-300
          ${data.isStreaming ? 'animate-pulse border-white' : ''}
        `}
        style={{
          clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)',
        }}
      >
        {/* Inner content with inverse clip to keep text readable */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#888888] rotate-45" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888]">
              User Constraint
            </span>
            {data.isStreaming && (
              <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse ml-auto" />
            )}
          </div>

          {/* Constraint text */}
          <p className="text-sm text-white/80 leading-relaxed font-mono">
            {data.text}
          </p>

          {/* Timestamp */}
          <p className="text-[9px] text-white/30 mt-2 font-mono">
            {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Glow effect when active */}
        {data.isStreaming && (
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)',
              boxShadow: '0 0 30px rgba(136, 136, 136, 0.5)',
            }}
          />
        )}
      </div>

      {/* Connection handles - hexagon has 6 sides, we use 4 main ones */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-[#888888] !border-none"
        style={{ top: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-[#888888] !border-none"
        style={{ bottom: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        className="!w-2 !h-2 !bg-[#888888] !border-none"
        style={{ left: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-[#888888] !border-none"
        style={{ right: 0 }}
      />
    </div>
  );
});

UserProxyNode.displayName = 'UserProxyNode';
