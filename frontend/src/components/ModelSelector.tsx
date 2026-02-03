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
          group flex items-center gap-2 h-8 px-3 rounded-full
          border transition-all duration-300 ease-out
          ${disabled 
            ? 'opacity-50 cursor-not-allowed border-white/10 text-white/40' 
            : isOpen
              ? 'border-white/20 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
              : 'border-white/10 hover:border-white/15 hover:bg-white/[0.03]'
          }
        `}
      >
        <div className={`
          flex items-center justify-center w-4 h-4 rounded-full transition-all duration-300
          ${selectedTier === 'fast' ? 'bg-emerald-500/20' : 'bg-violet-500/20'}
        `}>
          {selectedTier === 'fast' ? (
            <Zap className="w-2.5 h-2.5 text-emerald-400" />
          ) : (
            <Sparkles className="w-2.5 h-2.5 text-violet-400" />
          )}
        </div>
        <span className="text-xs font-medium text-white/90">
          {selectedTier === 'fast' ? 'Fast' : 'Pro'}
        </span>
        <ChevronUp 
          className={`
            w-3 h-3 text-white/40 transition-all duration-300 ease-out
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
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-b from-white/5 to-transparent rounded-2xl blur-xl" />
            
            {/* Main dropdown */}
            <div 
              className="
                relative overflow-hidden
                backdrop-blur-2xl bg-[#0c0c0c]/95 
                border border-white/[0.08] rounded-2xl
                shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]
              "
              style={{
                animation: 'dropdownIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Header */}
              <div className="px-3 pt-3 pb-2">
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                  Select Model
                </p>
              </div>
              
              {/* Divider */}
              <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Options */}
              <div className="p-1.5 space-y-0.5">
                {/* Fast option */}
                <button
                  type="button"
                  onClick={() => {
                    onTierChange('fast')
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-3 p-2.5 rounded-xl
                    transition-all duration-200 ease-out group/option
                    ${selectedTier === 'fast' 
                      ? 'bg-emerald-500/[0.08]' 
                      : 'hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <div className={`
                    w-9 h-9 rounded-xl flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'fast' 
                      ? 'bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.15)]' 
                      : 'bg-white/[0.05] group-hover/option:bg-white/[0.08]'
                    }
                  `}>
                    <Zap className={`w-4 h-4 transition-colors ${selectedTier === 'fast' ? 'text-emerald-400' : 'text-white/50'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`text-sm font-medium transition-colors ${selectedTier === 'fast' ? 'text-white' : 'text-white/80'}`}>
                      Fast
                    </span>
                    <p className="text-[10px] text-white/30 font-mono mt-0.5">
                      {MODEL_TIERS.fast.modelName}
                    </p>
                  </div>
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'fast' 
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.4)]' 
                      : 'border border-white/10'
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
                    w-full flex items-center gap-3 p-2.5 rounded-xl
                    transition-all duration-200 ease-out group/option
                    ${selectedTier === 'pro' 
                      ? 'bg-violet-500/[0.08]' 
                      : 'hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <div className={`
                    w-9 h-9 rounded-xl flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'pro' 
                      ? 'bg-violet-500/20 shadow-[0_0_20px_rgba(167,139,250,0.15)]' 
                      : 'bg-white/[0.05] group-hover/option:bg-white/[0.08]'
                    }
                  `}>
                    <Sparkles className={`w-4 h-4 transition-colors ${selectedTier === 'pro' ? 'text-violet-400' : 'text-white/50'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`text-sm font-medium transition-colors ${selectedTier === 'pro' ? 'text-white' : 'text-white/80'}`}>
                      Pro
                    </span>
                    <p className="text-[10px] text-white/30 font-mono mt-0.5">
                      {MODEL_TIERS.pro.modelName}
                    </p>
                  </div>
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${selectedTier === 'pro' 
                      ? 'bg-violet-500 shadow-[0_0_10px_rgba(167,139,250,0.4)]' 
                      : 'border border-white/10'
                    }
                  `}>
                    {selectedTier === 'pro' && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                  </div>
                </button>
              </div>

            </div>

            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#0c0c0c]/95 border-r border-b border-white/[0.08]" />
          </div>
        </>
      )}
    </div>
  )
}

export { MODEL_TIERS }
