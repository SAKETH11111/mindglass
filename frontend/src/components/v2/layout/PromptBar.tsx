import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles,
  Zap,
  Lightbulb,
  MessageSquare,
  ArrowUp,
  Mic,
  Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Quick action suggestions
const QUICK_ACTIONS = [
  { icon: Lightbulb, label: "Analyze", prompt: "Analyze the pros and cons of" },
  { icon: MessageSquare, label: "Debate", prompt: "Start a debate about" },
  { icon: Zap, label: "Quick take", prompt: "Give me a quick take on" },
];

interface PromptBarProps {
  onSubmit?: (prompt: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function PromptBar({ 
  onSubmit, 
  isLoading = false,
  placeholder = "Enter a topic for multi-agent debate..."
}: PromptBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    onSubmit?.(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setValue(prompt + " ");
    textareaRef.current?.focus();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 backdrop-blur-xl">
        {/* Quick actions row */}
        <AnimatePresence>
          {!value && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-2 pb-1 flex items-center gap-2 overflow-x-auto"
            >
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider shrink-0">
                Try:
              </span>
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  className="h-6 px-2 text-[10px] gap-1.5 border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)] hover:border-[var(--color-border-light)] shrink-0"
                >
                  <action.icon className="h-3 w-3" />
                  {action.label}
                </Button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input area */}
        <div className="p-3">
          <div 
            className={`
              relative flex items-end gap-2 p-2 rounded-xl
              bg-[var(--color-bg-secondary)] border transition-all duration-200
              ${isFocused 
                ? 'border-[var(--color-cerebras-orange)] shadow-[0_0_0_1px_var(--color-cerebras-orange),0_0_20px_rgba(241,90,41,0.15)]' 
                : 'border-[var(--color-border)] hover:border-[var(--color-border-light)]'
              }
            `}
          >
            {/* Sparkle icon */}
            <div className="shrink-0 p-1.5">
              <motion.div
                animate={isFocused ? { rotate: [0, 15, -15, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                <Sparkles 
                  className={`h-5 w-5 transition-colors ${
                    isFocused ? 'text-[var(--color-cerebras-orange)]' : 'text-[var(--color-text-muted)]'
                  }`} 
                />
              </motion.div>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className="
                flex-1 min-h-[24px] max-h-[120px] py-1.5 px-1
                bg-transparent text-[var(--color-text-primary)] 
                placeholder:text-[var(--color-text-muted)]
                outline-none resize-none
                text-sm leading-relaxed
                disabled:opacity-50
              "
            />

            {/* Right side actions */}
            <div className="shrink-0 flex items-center gap-1">
              {/* Attachment (placeholder) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled
                    className="h-8 w-8 text-[var(--color-text-muted)] opacity-50 cursor-not-allowed"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
                  <p className="text-xs">Attach file (coming soon)</p>
                </TooltipContent>
              </Tooltip>

              {/* Voice (placeholder) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled
                    className="h-8 w-8 text-[var(--color-text-muted)] opacity-50 cursor-not-allowed"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
                  <p className="text-xs">Voice input (coming soon)</p>
                </TooltipContent>
              </Tooltip>

              {/* Submit button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!value.trim() || isLoading}
                    className={`
                      h-8 w-8 rounded-lg transition-all duration-200
                      ${value.trim() && !isLoading
                        ? 'bg-[var(--color-cerebras-orange)] text-white hover:bg-[var(--color-cerebras-orange-hover)] shadow-lg shadow-[var(--color-cerebras-orange)]/25'
                        : 'bg-[var(--color-bg-raised)] text-[var(--color-text-muted)]'
                      }
                    `}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
                  <p className="text-xs">
                    {isLoading ? "Processing..." : "Send message"}
                    {!isLoading && <kbd className="ml-2 text-[10px] opacity-60">↵</kbd>}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Keyboard hints */}
          <div className="flex items-center justify-between mt-2 px-2 text-[10px] text-[var(--color-text-muted)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono">
                  Enter
                </kbd>
                <span>to send</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono">
                  Shift + Enter
                </kbd>
                <span>for new line</span>
              </span>
            </div>
            <span className="text-[var(--color-cerebras-orange)]">
              8 agents ready
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
