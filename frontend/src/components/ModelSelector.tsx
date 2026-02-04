import { useState, useRef, useEffect } from 'react'
import { Zap, Sparkles, Check, ChevronUp } from 'lucide-react'

export type ModelTier = 'fast' | 'pro'

export interface ModelConfig {
  tier: ModelTier
  modelId: string
  modelName: string
}

const MODEL_TIERS: Record<ModelTier, ModelConfig> = {
  fast: {
    tier: 'fast',
    modelId: 'llama3.1-8b',
    modelName: 'Llama 3.1 8B (~2200 tok/s)',
  },
  pro: {
    tier: 'pro',
    modelId: 'gpt-oss-120b',
    modelName: 'GPT-OSS 120B (~3000 tok/s)',
  },
}

interface ModelSelectorProps {
  selectedTier: ModelTier
  onTierChange: (tier: ModelTier) => void
  disabled?: boolean
}

export function ModelSelector({ selectedTier, onTierChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          group flex items-center gap-2 h-8 px-2.5
          transition-all duration-200
          border border-white/20 bg-[#111]
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : isOpen
              ? 'border-white/40 bg-white/5'
              : 'hover:border-white/30 hover:bg-white/[0.03]'
          }
        `}
      >
        {selectedTier === 'fast' ? (
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        )}
        <span className="text-white/90 font-mono text-xs uppercase tracking-wide">
          {selectedTier === 'fast' ? 'Fast' : 'Pro'}
        </span>
        <ChevronUp
          className={`
            w-3 h-3 text-white/40 transition-transform duration-200
            ${isOpen ? 'rotate-0' : 'rotate-180'}
          `}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 z-50">
            <div className="bg-[#111] border border-white/20 shadow-2xl shadow-black/50">
              {/* Header */}
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-[10px] text-white/50 font-mono uppercase tracking-wider">
                  SELECT MODEL
                </p>
              </div>

              {/* Options */}
              <div className="p-1.5 space-y-1">
                {/* Fast option */}
                <button
                  type="button"
                  onClick={() => {
                    onTierChange('fast')
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2.5 p-2 transition-all
                    ${selectedTier === 'fast'
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'border border-white/10 hover:border-white/20 hover:bg-white/5'
                    }
                  `}
                >
                  <Zap className={`w-4 h-4 ${selectedTier === 'fast' ? 'text-emerald-400' : 'text-white/40'}`} />
                  <div className="flex-1 text-left">
                    <span className={`text-xs font-mono uppercase tracking-wide ${selectedTier === 'fast' ? 'text-white' : 'text-white/70'}`}>
                      Fast
                    </span>
                  </div>
                  {selectedTier === 'fast' && (
                    <div className="w-4 h-4 bg-emerald-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* Pro option */}
                <button
                  type="button"
                  onClick={() => {
                    onTierChange('pro')
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2.5 p-2 transition-all
                    ${selectedTier === 'pro'
                      ? 'bg-violet-500/10 border border-violet-500/30'
                      : 'border border-white/10 hover:border-white/20 hover:bg-white/5'
                    }
                  `}
                >
                  <Sparkles className={`w-4 h-4 ${selectedTier === 'pro' ? 'text-violet-400' : 'text-white/40'}`} />
                  <div className="flex-1 text-left">
                    <span className={`text-xs font-mono uppercase tracking-wide ${selectedTier === 'pro' ? 'text-white' : 'text-white/70'}`}>
                      Pro
                    </span>
                  </div>
                  {selectedTier === 'pro' && (
                    <div className="w-4 h-4 bg-violet-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { MODEL_TIERS }
