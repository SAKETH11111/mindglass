import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useDebateStore } from '@/hooks/useDebateStore';

interface DebateInputProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export function DebateInput({ onSubmit, disabled = false }: DebateInputProps) {
  const [query, setQuery] = useState('');
  const { connectionState, isStreaming } = useDebateStore();

  const isConnecting = connectionState === 'connecting';
  const isConnected = connectionState === 'connected';
  const isDisabled = disabled || isStreaming || !isConnected;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || isDisabled) return;

      onSubmit(query.trim());
      setQuery('');
    },
    [query, isDisabled, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder={
              isConnecting
                ? 'Connecting...'
                : isStreaming
                  ? 'Agent is responding...'
                  : 'Enter your question...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            className="glass-input h-14 pl-6 pr-4 text-base rounded-full border-0
                       placeholder:text-text-muted text-text-primary
                       focus-visible:ring-2 focus-visible:ring-coral/50
                       transition-all duration-300
                       disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {isConnecting && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
            </div>
          )}
        </div>
        <Button
          type="submit"
          disabled={!query.trim() || isDisabled}
          className="h-14 w-14 rounded-full bg-coral hover:bg-coral-dark
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-300 glow-coral flex-shrink-0"
        >
          {isStreaming ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Send className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>

      {/* Helper text */}
      <p className="text-center text-text-muted text-xs mt-4">
        {isConnecting
          ? 'Connecting to debate server...'
          : isStreaming
            ? 'Receiving agent response...'
            : 'Ask anything to start a multi-agent debate'}
      </p>
    </form>
  );
}
