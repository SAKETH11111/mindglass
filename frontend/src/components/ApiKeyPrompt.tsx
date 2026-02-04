import { useState } from 'react';
import { useApiKeyStore } from '@/hooks/useApiKeyStore';
import { ExternalLink, X, Key } from 'lucide-react';

export function ApiKeyPrompt() {
  const { apiKey, setApiKey, hasSeenPrompt, markPromptSeen } = useApiKeyStore();
  const [inputKey, setInputKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Only show on first visit if no API key is set
  if (apiKey || hasSeenPrompt) return null;

  const handleSave = () => {
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      setIsSaved(true);
    }
  };

  const handleDismiss = () => {
    markPromptSeen();
  };

  const handleGetApiKey = () => {
    window.open('https://cloud.cerebras.ai/', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/20 p-8 shadow-2xl">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F15A29]/10 border border-[#F15A29]/30 flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-[#F15A29]" />
          </div>
          <h2 className="text-2xl font-bold text-white font-mono tracking-wider mb-2">
            WELCOME TO PRISM
          </h2>
          <p className="text-sm text-white/60 font-mono">
            Multi-agent AI consulting powered by Cerebras
          </p>
        </div>

        {/* Description */}
        <div className="space-y-4 mb-8">
          <p className="text-sm text-white/70 leading-relaxed text-center">
            PRISM uses the Cerebras API to run 8 expert AI agents simultaneously.
            Get your free API key to start debating.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-white/40 font-mono">
            <span>Fast tier:</span>
            <span className="text-emerald-400">Llama 3.1 8B</span>
            <span className="mx-2">|</span>
            <span>Pro tier:</span>
            <span className="text-violet-400">GPT-OSS 120B</span>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">
              Cerebras API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="csk-..."
              className="w-full bg-[#111] border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#F15A29]/50 transition-colors"
            />
          </div>

          {/* Get API Key link */}
          <button
            onClick={handleGetApiKey}
            className="flex items-center justify-center gap-2 text-xs text-[#F15A29] hover:text-[#F15A29]/80 transition-colors font-mono w-full"
          >
            <ExternalLink className="w-3 h-3" />
            Get your free API key from Cerebras Cloud
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 border border-white/20 text-white/50 font-mono text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={!inputKey.trim() || isSaved}
            className={`flex-1 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-colors ${
              isSaved
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                : 'bg-[#F15A29] text-white hover:bg-[#F15A29]/90'
            }`}
          >
            {isSaved ? 'Saved!' : 'Start Debating'}
          </button>
        </div>

        {/* Note */}
        <p className="text-[10px] text-white/30 mt-6 text-center font-mono">
          Your API key is stored locally and sent only to run your sessions. It is not stored on our servers.
          <br />
          You can add it later from the settings menu.
        </p>
      </div>
    </div>
  );
}
