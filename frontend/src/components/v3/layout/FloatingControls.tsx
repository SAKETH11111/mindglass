import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FloatingControlsProps {
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onToggleMinimap?: () => void;
  minimapVisible?: boolean;
  locked?: boolean;
  onToggleLock?: () => void;
}

export function FloatingControls({
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleMinimap,
  minimapVisible = true,
  locked = false,
  onToggleLock,
}: FloatingControlsProps) {
  const [isHovered, setIsHovered] = useState(false);

  const controls = [
    {
      icon: ZoomIn,
      label: 'Zoom in',
      shortcut: '⌘+',
      onClick: onZoomIn,
    },
    {
      icon: ZoomOut,
      label: 'Zoom out',
      shortcut: '⌘-',
      onClick: onZoomOut,
    },
    {
      icon: Maximize2,
      label: 'Fit view',
      shortcut: '⌘0',
      onClick: onFitView,
    },
    {
      icon: minimapVisible ? Eye : EyeOff,
      label: minimapVisible ? 'Hide minimap' : 'Show minimap',
      shortcut: '⌘M',
      onClick: onToggleMinimap,
    },
    {
      icon: Grid3X3,
      label: 'Toggle grid',
      shortcut: '⌘G',
      onClick: () => {},
    },
    {
      icon: locked ? Lock : Unlock,
      label: locked ? 'Unlock canvas' : 'Lock canvas',
      shortcut: '⌘L',
      onClick: onToggleLock,
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        className="fixed bottom-28 right-6 z-40"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Glass container */}
        <motion.div
          className="relative overflow-hidden rounded-2xl"
          animate={{
            boxShadow: isHovered
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              : '0 10px 40px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Frosted glass background */}
          <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-xl" />
          
          {/* Subtle gradient overlay */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
            }}
          />

          {/* Control buttons */}
          <div className="relative flex flex-col gap-0.5 p-1.5">
            {controls.map((control, index) => {
              const Icon = control.icon;
              return (
                <Tooltip key={control.label}>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={control.onClick}
                      className="relative flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.6 + index * 0.05,
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="flex items-center gap-2">
                    <span>{control.label}</span>
                    <kbd className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                      {control.shortcut}
                    </kbd>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Zoom level indicator */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 border-t border-white/10 pt-2">
                    <div className="flex h-8 items-center justify-center">
                      <span className="text-xs font-medium text-zinc-400">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}
