import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlowingDotProps {
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const sizes = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export function GlowingDot({
  className,
  color = '#22c55e',
  size = 'md',
  pulse = true,
}: GlowingDotProps) {
  return (
    <span className={cn('relative inline-flex', className)}>
      {pulse && (
        <motion.span
          className={cn('absolute inline-flex rounded-full opacity-75', sizes[size])}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.75, 0, 0.75],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <span
        className={cn('relative inline-flex rounded-full', sizes[size])}
        style={{ 
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </span>
  );
}
