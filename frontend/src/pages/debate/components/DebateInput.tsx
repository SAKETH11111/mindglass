import { useState, useCallback } from 'react';
import { Send } from 'lucide-react';

interface DebateInputProps {
  onSubmit: (constraint: string) => void;
  disabled?: boolean;
}

export function DebateInput({ onSubmit, disabled = false }: DebateInputProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setValue('');
  }, [value, disabled, onSubmit]);

  return (
    <div className="
      px-6 py-4
      border-t border-white/[0.06]
      bg-black/20
      backdrop-blur-sm
    ">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className={`
            flex items-center gap-3
            px-4 py-3
            rounded-2xl
            backdrop-blur-xl
            bg-white/[0.03]
            border border-white/[0.1]
            transition-all duration-200
            ${isFocused 
              ? 'border-white/[0.25] shadow-[0_0_24px_rgba(255,255,255,0.05)]' 
              : ''
            }
          `}>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Add a constraint... (e.g., 'We only have $5k budget')"
              disabled={disabled}
              className="
                flex-1
                bg-transparent
                text-white
                placeholder-white/30
                outline-none
                text-sm
                font-sans
                disabled:opacity-50
              "
            />
            
            <button
              type="submit"
              disabled={disabled || !value.trim()}
              className="
                w-9 h-9
                rounded-xl
                flex items-center justify-center
                bg-white/[0.05]
                border border-white/[0.1]
                text-white/40
                hover:text-white
                hover:bg-white/[0.1]
                hover:border-white/[0.2]
                disabled:opacity-30
                disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        
        {/* Footer attribution */}
        <p className="text-center mt-3 text-[10px] text-white/20">
          Powered by <span className="text-white/30 font-medium">Cerebras</span> ⚡
        </p>
      </div>
    </div>
  );
}
