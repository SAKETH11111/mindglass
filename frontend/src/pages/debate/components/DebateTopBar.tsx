import { Zap } from 'lucide-react';

interface DebateTopBarProps {
  tokensPerSecond: number;
  isLive: boolean;
}

export function DebateTopBar({ tokensPerSecond, isLive }: DebateTopBarProps) {
  return (
    <header className="flex-shrink-0 h-14 border-b border-white/[0.06]">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Logo & Product Name */}
        <div className="flex items-center gap-3 group cursor-default">
          {/* Logo with subtle glow on hover */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="
              relative w-8 h-8 
              rounded-lg
              bg-gradient-to-br from-white/10 to-white/5
              border border-white/10
              flex items-center justify-center
              shadow-[0_0_20px_rgba(255,255,255,0.05)]
            ">
              <span className="text-lg">◈</span>
            </div>
          </div>
          <span className="text-base font-semibold text-white/90 tracking-tight">
            Prism
          </span>
        </div>

        {/* Right: Live Status + Token Counter */}
        <div className="flex items-center gap-4">
          {/* Token Counter - The proof of speed */}
          <div className="
            flex items-center gap-2
            px-3 py-1.5
            rounded-full
            bg-white/[0.03]
            border border-white/[0.08]
          ">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-mono text-white/70">
              {tokensPerSecond.toLocaleString()}
            </span>
            <span className="text-xs text-white/40">t/s</span>
          </div>
          
          {/* Live Indicator */}
          <div className="
            flex items-center gap-2
            px-3 py-1.5
            rounded-full
            bg-white/[0.03]
            border border-white/[0.08]
          ">
            <span className={`
              w-2 h-2 rounded-full
              ${isLive 
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse' 
                : 'bg-white/30'
              }
            `} />
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
              {isLive ? 'Live' : 'Paused'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
