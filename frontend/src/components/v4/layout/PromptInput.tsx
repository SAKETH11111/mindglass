import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Square,
  Sparkles,
} from 'lucide-react';
import { BorderBeam } from '../ui/border-beam';

interface PromptInputProps {
  className?: string;
  onSubmit?: (message: string) => void;
  onStop?: () => void;
  isProcessing?: boolean;
  placeholder?: string;
}

export function PromptInput({
  className,
  onSubmit,
  onStop,
  isProcessing = false,
  placeholder = 'Describe what you want the agents to debate...',
}: PromptInputProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && onSubmit && !isProcessing) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !isProcessing;

  return (
    <motion.div
      className={cn(
        'fixed bottom-12 left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 px-4',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {/* Input container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl',
          'border transition-colors duration-200',
          isFocused 
            ? 'border-zinc-600 bg-zinc-900' 
            : 'border-zinc-800 bg-zinc-900/80',
        )}
      >
        {/* Border beam when focused */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <BorderBeam size={100} duration={8} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="relative flex items-end gap-2 p-3">
          {/* Sparkle icon */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <Sparkles className="h-4 w-4 text-zinc-600" />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={1}
            disabled={isProcessing}
            className={cn(
              'max-h-[200px] min-h-[24px] flex-1 resize-none',
              'bg-transparent text-sm leading-relaxed text-white',
              'placeholder-zinc-500 outline-none',
              'disabled:opacity-50'
            )}
          />

          {/* Submit/Stop button */}
          <motion.button
            onClick={isProcessing ? onStop : handleSubmit}
            disabled={!canSubmit && !isProcessing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              'transition-all duration-200',
              isProcessing
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : canSubmit
                  ? 'bg-white text-zinc-900 hover:bg-zinc-200'
                  : 'bg-zinc-800 text-zinc-500'
            )}
          >
            {isProcessing ? (
              <Square className="h-3 w-3" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-between border-t border-zinc-800/50 px-3 py-1.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600">
              <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono">⏎</kbd>
              <span className="ml-1">Send</span>
            </span>
            <span className="text-[10px] text-zinc-600">
              <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono">⇧⏎</kbd>
              <span className="ml-1">New line</span>
            </span>
          </div>
          <span className="text-[10px] text-zinc-600">
            Powered by <span className="text-[#F15A29]">Cerebras</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
