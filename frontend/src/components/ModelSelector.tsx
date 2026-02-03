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
    modelName: 'Llama 3.1 8B',
  },
  pro: {
    tier: 'pro',
    modelId: 'gpt-oss-120b',
    modelName: 'GPT-OSS 120B',
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
          group flex items-center gap-2 h-8 px-3
          border-2 transition-all duration-200
          font-mono text-xs tracking-wide
          ${disabled
            ? 'opacity-50 cursor-not-allowed border-white/20 text-white/40'
            : isOpen
              ? 'border-white/50 bg-white/10'
              : 'border-white/30 hover:border-white/40 hover:bg-white/5'
          }
        `}
      >
        <div className={`
          flex items-center justify-center w-4 h-4 transition-all duration-200
          ${selectedTier === 'fast' ? 'bg-emerald-500/20' : 'bg-violet-500/20'}
        `}>
          {selectedTier === 'fast' ? (
            <Zap className="w-2.5 h-2.5 text-emerald-400" />
          ) : (
            <Sparkles className="w-2.5 h-2.5 text-violet-400" />
          )}
        </div>
        <span className="text-white/90 uppercase">
          {selectedTier === 'fast' ? 'Fast' : 'Pro'}
        </span>
        <ChevronUp
          className={`
            w-3 h-3 text-white/40 transition-all duration-200
            ${isOpen ? 'rotate-0 text-white/60' : 'rotate-180'}
          `}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop blur layer */}
          <div className="fixed inset-0 z-40" aria-hidden="true" />
          
          <div 
            className="
              absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52
              z-50
            "
          >
            {/* Main dropdown */}
            <div
              className="
                relative overflow-hidden
                bg-[#111]
                border-2 border-white/30
                shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]
              "
              style={{
                animation: 'dropdownIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Header */}
              <div className="px-3 pt-3 pb-2 border-b-2 border-white/10">
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  [SELECT MODEL]
                </p>
              </div>

              {/* Options */}
              <div className="p-2 space-y-1">
                {/* Fast option */}
                <button
                  type="button"
                  onClick={() => {
                    onTierChange('fast')
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-3 p-2.5
                    border-2 transition-all duration-200 group/option
                    font-mono
                    ${selectedTier === 'fast'
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'fast'
                      ? 'bg-emerald-500/20'
                      : 'bg-white/5 group-hover/option:bg-white/10'
                    }
                  `}>
                    <Zap className={`w-4 h-4 transition-colors ${selectedTier === 'fast' ? 'text-emerald-400' : 'text-white/50'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`text-sm uppercase tracking-wide transition-colors ${selectedTier === 'fast' ? 'text-white' : 'text-white/70'}`}>
                      Fast
                    </span>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {MODEL_TIERS.fast.modelName}
                    </p>
                  </div>
                  <div className={`
                    w-5 h-5 flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'fast'
                      ? 'bg-emerald-500'
                      : 'border-2 border-white/20'
                    }
                  `}>
                    {selectedTier === 'fast' && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                  </div>
                </button>

                {/* Pro option */}
                <button
                  type="button"
                  onClick={() => {
                    onTierChange('pro')
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-3 p-2.5
                    border-2 transition-all duration-200 group/option
                    font-mono
                    ${selectedTier === 'pro'
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'pro'
                      ? 'bg-violet-500/20'
                      : 'bg-white/5 group-hover/option:bg-white/10'
                    }
                  `}>
                    <Sparkles className={`w-4 h-4 transition-colors ${selectedTier === 'pro' ? 'text-violet-400' : 'text-white/50'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`text-sm uppercase tracking-wide transition-colors ${selectedTier === 'pro' ? 'text-white' : 'text-white/70'}`}>
                      Pro
                    </span>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {MODEL_TIERS.pro.modelName}
                    </p>
                  </div>
                  <div className={`
                    w-5 h-5 flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'pro'
                      ? 'bg-violet-500'
                      : 'border-2 border-white/20'
                    }
                  `}>
                    {selectedTier === 'pro' && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                  </div>
                </button>
              </div>

            </div>

            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#111] border-r-2 border-b-2 border-white/30" />
          </div>
        </>
      )}
    </div>
  )
}

export { MODEL_TIERS }
