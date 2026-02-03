import { Play, Pause } from 'lucide-react';

interface DebateTimelineProps {
  currentTime: number;
  totalTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

export function DebateTimeline({ 
  currentTime, 
  totalTime, 
  isPlaying, 
  onPlayPause, 
  onSeek 
}: DebateTimelineProps) {
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * totalTime;
    onSeek(Math.max(0, Math.min(totalTime, newTime)));
  };

  return (
    <div className="
      px-6 py-3
      border-t border-white/[0.06]
      bg-black/10
      backdrop-blur-sm
    ">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          className="
            w-10 h-10
            rounded-full
            flex items-center justify-center
            bg-white/[0.05]
            border border-white/[0.1]
            text-white/70
            hover:text-white
            hover:bg-white/[0.1]
            hover:border-white/[0.2]
            transition-all duration-200
            shadow-[0_4px_12px_rgba(0,0,0,0.3)]
          "
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>
        
        {/* Current Time */}
        <span className="text-xs font-mono text-white/50 w-10 text-right">
          {formatTime(currentTime)}
        </span>
        
        {/* Track */}
        <div 
          className="
            flex-1 h-2
            rounded-full
            bg-white/[0.05]
            border border-white/[0.08]
            cursor-pointer
            group
            relative
            overflow-hidden
          "
          onClick={handleTrackClick}
        >
          {/* Progress fill */}
          <div 
            className="
              absolute inset-y-0 left-0
              bg-gradient-to-r from-white/30 to-white/20
              rounded-full
              transition-all duration-100
            "
            style={{ width: `${progress}%` }}
          />
          
          {/* Playhead */}
          <div 
            className="
              absolute top-1/2 -translate-y-1/2
              w-3 h-3
              rounded-full
              bg-white
              shadow-[0_0_8px_rgba(255,255,255,0.5)]
              transition-all duration-100
              group-hover:scale-125
            "
            style={{ left: `calc(${progress}% - 6px)` }}
          />
          
          {/* Hover tooltip - shows time at cursor position */}
          <div className="
            absolute inset-0
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          ">
            {/* This would show time tooltip on hover - simplified for now */}
          </div>
        </div>
        
        {/* Total Time */}
        <span className="text-xs font-mono text-white/50 w-10">
          {formatTime(totalTime)}
        </span>
      </div>
    </div>
  );
}
