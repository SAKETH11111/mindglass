import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export function TextShimmer({ 
  children, 
  className,
  duration = 2,
}: TextShimmerProps) {
  return (
    <motion.span
      className={cn(
        'inline-block bg-clip-text text-transparent',
        'bg-[length:200%_100%]',
        className
      )}
      style={{
        backgroundImage: 'linear-gradient(90deg, #71717a 0%, #fafafa 50%, #71717a 100%)',
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}
