import { motion } from "framer-motion";
import { 
  MessageSquare, 
  Send, 
  Sparkles,
  Brain,
  Layers,
  Zap
} from "lucide-react";
import { V1Layout } from "@/components/v1/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Placeholder for where the canvas will go
function CanvasPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center max-w-2xl"
      >
        {/* Animated brain icon */}
        <motion.div
          className="mx-auto mb-8 relative"
          animate={{ 
            rotate: [0, 5, -5, 0],
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--color-cerebras-orange)]/20 to-[var(--color-mandarin)]/10 flex items-center justify-center border border-[var(--color-border)]">
            <Brain className="w-12 h-12 text-[var(--color-cerebras-orange)]" />
          </div>
          
          {/* Orbiting dots */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute -top-8 left-1/2 w-2 h-2 -ml-1 rounded-full bg-[var(--color-cerebras-teal)]" />
          </motion.div>
          <motion.div
            className="absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute -top-10 left-1/2 w-1.5 h-1.5 -ml-0.75 rounded-full bg-[var(--color-purple)]" />
          </motion.div>
        </motion.div>

        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
          Multi-Agent Debate Canvas
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed">
          This is where the React Flow debate canvas will be rendered.
          <br />
          <span className="text-[var(--color-text-muted)]">
            8 agents • 4 phases • Real-time visualization
          </span>
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <FeatureCard 
            icon={Layers} 
            label="8 Agents" 
            color="var(--color-cerebras-orange)"
          />
          <FeatureCard 
            icon={MessageSquare} 
            label="4 Phases" 
            color="var(--color-cerebras-teal)"
          />
          <FeatureCard 
            icon={Zap} 
            label="Real-time" 
            color="var(--color-purple)"
          />
        </div>

        {/* Placeholder CTA */}
        <Button
          size="lg"
          className="bg-[var(--color-cerebras-orange)] hover:bg-[var(--color-cerebras-orange-hover)] text-white font-medium px-8"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Start Debate
        </Button>
      </motion.div>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  label, 
  color 
}: { 
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; 
  label: string; 
  color: string;
}) {
  return (
    <Card className="p-4 bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-colors">
      <Icon 
        className="w-5 h-5 mx-auto mb-2" 
        style={{ color }}
      />
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
    </Card>
  );
}

// Input section at bottom
function DebateInputSection() {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/95 to-transparent">
      <div className="max-w-3xl mx-auto">
        <Card className="p-4 bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl border-[var(--color-border)] shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-bg-raised)] border border-[var(--color-border)]">
              <Sparkles className="w-5 h-5 text-[var(--color-text-muted)]" />
            </div>
            <Input
              placeholder="Enter a topic for multi-agent debate..."
              className="flex-1 bg-transparent border-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
            <Button 
              size="icon"
              className="w-10 h-10 bg-[var(--color-cerebras-orange)] hover:bg-[var(--color-cerebras-orange-hover)] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-muted)]">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-raised)] border border-[var(--color-border)] font-mono text-[10px]">
              Enter
            </kbd>
            <span>to send</span>
            <span className="mx-1 opacity-40">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-raised)] border border-[var(--color-border)] font-mono text-[10px]">
              ⌘K
            </kbd>
            <span>for commands</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Main V1 Page
export function V1Page() {
  return (
    <V1Layout>
      <div className="h-full flex flex-col relative">
        <CanvasPlaceholder />
        <DebateInputSection />
      </div>
    </V1Layout>
  );
}

export default V1Page;
