import { useState } from 'react';
import { useDebateStore } from '@/hooks/useDebateStore';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';

export function ApiKeyModal() {
  const { showApiKeyModal, setShowApiKeyModal, setCustomApiKey, customApiKey } = useDebateStore();
  const [inputKey, setInputKey] = useState(customApiKey || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!showApiKeyModal) return null;

  const handleSave = () => {
    if (inputKey.trim()) {
      setCustomApiKey(inputKey.trim());
      setIsSaved(true);
      setTimeout(() => {
        setShowApiKeyModal(false);
        setIsSaved(false);
      }, 1500);
    }
  };

  const handleClose = () => {
    setShowApiKeyModal(false);
  };

  const handleGetApiKey = () => {
    window.open('https://cloud.cerebras.ai/', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/20 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#F15A29]/10 border border-[#F15A29]/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#F15A29]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono tracking-wider">
              CONNECTION ISSUE
            </h2>
            <p className="text-xs text-white/50 font-mono">
              We're having trouble connecting to Cerebras
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-white/70 mb-6 leading-relaxed">
          Our shared API key may be experiencing rate limits. You can use your own Cerebras API key to continue without interruptions.
        </p>

        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">
              Your Cerebras API Key
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
            className="flex items-center gap-2 text-xs text-[#F15A29] hover:text-[#F15A29]/80 transition-colors font-mono"
          >
            <ExternalLink className="w-3 h-3" />
            Get your free API key from Cerebras Cloud
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-white/20 text-white/70 font-mono text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
          >
            Cancel
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
            {isSaved ? 'Saved!' : 'Use My API Key'}
          </button>
        </div>

        {/* Note */}
        <p className="text-[10px] text-white/30 mt-4 text-center font-mono">
          Your API key is stored locally in your browser and never sent to our servers.
        </p>
      </div>
    </div>
  );
}
