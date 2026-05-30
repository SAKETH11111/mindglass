import { Sparkles } from 'lucide-react'
import { MODEL_LABEL, type ModelTier } from '@/lib/models'

interface ModelSelectorProps {
  selectedTier: ModelTier
}

export function ModelSelector({ selectedTier }: ModelSelectorProps) {
  return (
    <div
      className="flex items-center gap-2 h-8 px-2.5 border border-white/20 bg-[#111]"
      data-model={selectedTier}
    >
      <Sparkles className="w-3.5 h-3.5 text-sky-300" />
      <span className="text-white/90 font-mono text-xs uppercase tracking-wide">
        {MODEL_LABEL}
      </span>
    </div>
  )
}
