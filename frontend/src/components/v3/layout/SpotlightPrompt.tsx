import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, Paperclip, Mic } from 'lucide-react';

interface SpotlightPromptProps {
  onSubmit?: (message: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
}

export function SpotlightPrompt({
  onSubmit,
  isProcessing = false,
  placeholder = "Ask anything about your codebase...",
}: SpotlightPromptProps) {
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

  return (
    <motion.div
      className="fixed bottom-32 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Spotlight glow effect */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="pointer-events-none absolute -inset-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              className="absolute inset-0 rounded-3xl"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(241, 90, 41, 0.15) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main container */}
      <motion.div
        className="relative overflow-hidden rounded-2xl"
        animate={{
          boxShadow: isFocused
            ? '0 25px 80px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(241, 90, 41, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 15px 50px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-2xl" />
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%)',
          }}
        />

        {/* Content */}
        <div className="relative p-3">
          {/* Textarea row */}
          <div className="flex items-end gap-3">
            {/* Left accessories */}
            <div className="flex items-center gap-1 pb-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                <Paperclip className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Input area */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                rows={1}
                className="max-h-[200px] min-h-[24px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder-zinc-500 outline-none"
                disabled={isProcessing}
              />
            </div>

            {/* Right accessories */}
            <div className="flex items-center gap-1 pb-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                <Mic className="h-4 w-4" />
              </motion.button>

              {/* Submit button */}
              <motion.button
                onClick={handleSubmit}
                disabled={!value.trim() || isProcessing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg transition-all disabled:opacity-40"
                animate={{
                  backgroundColor: value.trim() ? 'rgb(241, 90, 41)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <Sparkles className="h-4 w-4 animate-pulse text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="send"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <ArrowUp className="h-4 w-4 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Quick actions bar */}
          <motion.div
            className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {[
              { icon: '💡', label: 'Explain this code' },
              { icon: '🔍', label: 'Find bugs' },
              { icon: '✨', label: 'Improve performance' },
              { icon: '📝', label: 'Add documentation' },
            ].map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setValue(action.label)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </motion.button>
            ))}
            
            {/* Keyboard hint */}
            <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-600">
              <kbd className="rounded bg-zinc-800 px-1.5 py-0.5">⌘</kbd>
              <kbd className="rounded bg-zinc-800 px-1.5 py-0.5">⏎</kbd>
              <span className="ml-1">to send</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
