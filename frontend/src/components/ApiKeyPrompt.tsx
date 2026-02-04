import { useState } from 'react';
import { useApiKeyStore } from '@/hooks/useApiKeyStore';
import { ExternalLink, X, Key } from 'lucide-react';

interface ApiKeyPromptProps {
  isOpen: boolean;
  onContinue: () => void;
  onSkip: () => void;
}

export function ApiKeyPrompt({ isOpen, onContinue, onSkip }: ApiKeyPromptProps) {
  const { apiKey, setApiKey, markPromptSeen } = useApiKeyStore();
  const [inputKey, setInputKey] = useState(apiKey || '');

  if (!isOpen) return null;

  const handleSave = () => {
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
    }
    onContinue();
  };

  const handleSkip = () => {
    markPromptSeen();
    onSkip();
  };

  const handleGetApiKey = () => {
    window.open('https://cloud.cerebras.ai/', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-[560px] border border-white/15 bg-[rgba(38,38,38,0.8)] backdrop-blur-[12px] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-7 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-[#F15A29]/15 border border-[#F15A29]/40 flex items-center justify-center">
              <Key className="h-6 w-6 text-[#F15A29]" />
            </div>
            <div>
              <h2 className="text-xl text-white font-semibold tracking-wide">WELCOME TO PRISM</h2>
              <p className="text-[12px] text-white/60 font-mono">
                Multi-agent AI consulting powered by Cerebras
              </p>
            </div>
          </div>
        </div>

        <div className="px-7 pt-6 space-y-4">
          <p className="text-sm text-white/70 leading-relaxed">
            PRISM uses the Cerebras API to run 8 expert AI agents simultaneously. Get your free API key to start debating.
          </p>

          <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
            <span>Fast tier:</span>
            <span className="text-white">Llama 3.1 8B</span>
            <span className="text-white/30">|</span>
            <span>Pro tier:</span>
            <span className="text-white">GPT-OSS 120B</span>
          </div>

          <div className="pt-4 space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-white/40 font-mono">
              Cerebras API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="csk-..."
              className="w-full bg-[#111] border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#F15A29]/60 transition-colors"
            />
            <button
              onClick={handleGetApiKey}
              className="flex items-center gap-2 text-xs text-[#F15A29] hover:text-[#F15A29]/80 transition-colors font-mono"
            >
              <ExternalLink className="w-3 h-3" />
              Get your free API key from Cerebras Cloud
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-7 py-6">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 border border-white/20 text-white/60 font-mono text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 font-mono text-xs uppercase tracking-wider bg-[#F15A29] text-white hover:bg-[#F15A29]/90 transition-colors"
          >
            Start Debating
          </button>
        </div>

        <div className="px-7 pb-6">
          <p className="text-[10px] text-white/35 font-mono">
            Your API key is stored locally and sent only to run your sessions. It is not stored on our servers.
            <br />
            You can add it later from the settings menu.
          </p>
        </div>
      </div>
    </div>
  );
}
