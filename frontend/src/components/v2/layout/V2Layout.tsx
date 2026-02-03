import { useState } from "react";
import { motion } from "framer-motion";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";
import { PromptBar } from "./PromptBar";
import { InspectorPanel } from "./InspectorPanel";
import { Toaster } from "@/components/ui/sonner";

interface V2LayoutProps {
  children: React.ReactNode;
}

export function V2Layout({ children }: V2LayoutProps) {
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const handleSubmit = (prompt: string) => {
    console.log("Submitted:", prompt);
    setIsRunning(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Subtle wafer grid */}
        <div className="absolute inset-0 wafer-grid opacity-30" />
        
        {/* Gradient orbs - more subtle for v2 */}
        <motion.div
          className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(241, 90, 41, 0.04) 0%, transparent 60%)",
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61, 138, 138, 0.04) 0%, transparent 60%)",
          }}
          animate={{
            x: [0, -20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Top Bar */}
      <TopBar 
        isConnected={true}
        workspaceName="Multi-Agent Debate"
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>

        {/* Inspector Panel */}
        <InspectorPanel 
          isOpen={inspectorOpen}
          onToggle={() => setInspectorOpen(!inspectorOpen)}
        />
      </div>

      {/* Prompt Bar */}
      <PromptBar 
        onSubmit={handleSubmit}
        isLoading={isRunning}
      />

      {/* Status Bar */}
      <StatusBar 
        phase={isRunning ? "DISPATCH" : "IDLE"}
        activeAgents={isRunning ? 3 : 0}
        tokens={isRunning ? 1247 : 0}
        latency={42}
        isRunning={isRunning}
        onPlayPause={() => setIsRunning(!isRunning)}
        onReset={() => setIsRunning(false)}
      />

      {/* Toast notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
          },
        }}
      />
    </div>
  );
}
