import { useState, useRef, useEffect } from 'react'
import { Building2, Laptop, ShoppingCart, Landmark, Heart, Factory, Briefcase, Film, Home, User, ChevronUp, Check } from 'lucide-react'

export type IndustryType = 'any' | 'saas' | 'ecommerce' | 'fintech' | 'healthcare' | 'manufacturing' | 'consulting' | 'media' | 'realestate' | 'personal'

export interface IndustryConfig {
  value: IndustryType
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export const INDUSTRIES: IndustryConfig[] = [
  { value: 'any', label: 'Any Industry', shortLabel: 'Any', icon: Building2, color: 'text-white/60' },
  { value: 'saas', label: 'SaaS / Software', shortLabel: 'SaaS', icon: Laptop, color: 'text-blue-400' },
  { value: 'ecommerce', label: 'E-commerce / Retail', shortLabel: 'E-com', icon: ShoppingCart, color: 'text-orange-400' },
  { value: 'fintech', label: 'Fintech / Banking', shortLabel: 'Fintech', icon: Landmark, color: 'text-emerald-400' },
  { value: 'healthcare', label: 'Healthcare / Biotech', shortLabel: 'Health', icon: Heart, color: 'text-red-400' },
  { value: 'manufacturing', label: 'Manufacturing', shortLabel: 'Mfg', icon: Factory, color: 'text-yellow-400' },
  { value: 'consulting', label: 'Consulting / Agency', shortLabel: 'Agency', icon: Briefcase, color: 'text-purple-400' },
  { value: 'media', label: 'Media / Entertainment', shortLabel: 'Media', icon: Film, color: 'text-pink-400' },
  { value: 'realestate', label: 'Real Estate', shortLabel: 'RE', icon: Home, color: 'text-cyan-400' },
  { value: 'personal', label: 'Personal Decision', shortLabel: 'Personal', icon: User, color: 'text-white/80' },
]

interface IndustrySelectorProps {
  selectedIndustry: IndustryType
  onIndustryChange: (industry: IndustryType) => void
  disabled?: boolean
}

export function IndustrySelector({ selectedIndustry, onIndustryChange, disabled }: IndustrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedConfig = INDUSTRIES.find(i => i.value === selectedIndustry) || INDUSTRIES[0]
  const IconComponent = selectedConfig.icon

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
        <IconComponent className={`w-3.5 h-3.5 ${selectedConfig.color}`} />
        <span className="text-white/90 font-mono text-xs uppercase tracking-wide">
          {selectedConfig.shortLabel}
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

          {/* Menu - opens upward */}
          <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[200px]">
            <div className="bg-[#0a0a0a] border border-white/20 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                  Industry Context
                </p>
              </div>

              {/* Options */}
              <div className="py-1 max-h-[280px] overflow-y-auto">
                {INDUSTRIES.map((industry) => {
                  const Icon = industry.icon
                  const isSelected = industry.value === selectedIndustry

                  return (
                    <button
                      key={industry.value}
                      type="button"
                      onClick={() => {
                        onIndustryChange(industry.value)
                        setIsOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left
                        transition-colors duration-100
                        ${isSelected
                          ? 'bg-white/10'
                          : 'hover:bg-white/[0.05]'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 ${industry.color}`} />
                      <div className="flex-1">
                        <p className={`text-xs ${isSelected ? 'text-white' : 'text-white/80'}`}>
                          {industry.label}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white/60" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
