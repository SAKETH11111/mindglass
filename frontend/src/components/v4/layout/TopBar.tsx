import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Settings, 
  Zap, 
  ChevronDown,
  Keyboard,
} from 'lucide-react';
import { GlowingDot } from '../ui/glowing-dot';

interface TopBarProps {
  className?: string;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  workspaceName?: string;
}

export function TopBar({ 
  className,
  connectionStatus = 'connected',
  workspaceName = 'Prism',
}: TopBarProps) {
  const statusColors = {
    connected: '#22c55e',
    connecting: '#eab308',
    disconnected: '#ef4444',
  };

  return (
    <motion.header
      className={cn(
        'fixed left-0 right-0 top-0 z-50',
        'flex h-12 items-center justify-between px-4',
        'border-b border-zinc-800/50',
        'bg-zinc-950/80 backdrop-blur-xl',
        className
      )}
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Left: Logo + Workspace */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div 
            className="h-6 w-6 rounded-md"
            style={{ 
              background: 'linear-gradient(135deg, #F15A29 0%, #FF985D 100%)',
            }}
          />
          <span className="text-sm font-semibold text-white">
            {workspaceName}
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* Workspace dropdown */}
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white">
          <span>Multi-Agent Debate</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Center: Status */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center gap-2 rounded-full bg-zinc-900/80 px-3 py-1">
          <GlowingDot color={statusColors[connectionStatus]} size="sm" />
          <span className="text-xs text-zinc-500">
            {connectionStatus === 'connected' && 'Ready'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'disconnected' && 'Offline'}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Keyboard shortcuts hint */}
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-white">
          <Keyboard className="h-4 w-4" />
          <kbd className="hidden text-[10px] font-medium sm:inline">⌘K</kbd>
        </button>

        {/* Performance indicator */}
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-white">
          <Zap className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Cerebras</span>
        </button>

        {/* Settings */}
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-white">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </motion.header>
  );
}
