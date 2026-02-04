import { useState } from 'react';
import { useApiKeyStore } from '@/hooks/useApiKeyStore';
import { X, Key, ExternalLink, Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { apiKey, setApiKey, clearApiKey } = useApiKeyStore();
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [showSaved, setShowSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  };

  const handleClear = () => {
    clearApiKey();
    setInputKey('');
  };

  const handleGetApiKey = () => {
    window.open('https://cloud.cerebras.ai/', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/20 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-white/60" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono tracking-wider">
              SETTINGS
            </h2>
            <p className="text-xs text-white/50 font-mono">
              Manage your API configuration
            </p>
          </div>
        </div>

        {/* API Key Section */}
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
              className="w-full bg-[#111] border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
            />
            <p className="text-[10px] text-white/30 mt-2 font-mono">
              Stored locally in your browser. Never sent to our servers.
            </p>
          </div>

          {/* Get API Key link */}
          <button
            onClick={handleGetApiKey}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors font-mono"
          >
            <ExternalLink className="w-3 h-3" />
            Get API key from Cerebras Cloud
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {apiKey && (
            <button
              onClick={handleClear}
              className="px-4 py-3 border border-red-500/30 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!inputKey.trim() || inputKey === apiKey}
            className={`flex-1 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-colors ${
              showSaved
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                : inputKey === apiKey
                ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {showSaved ? 'Saved' : inputKey === apiKey ? 'No Changes' : 'Save API Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
