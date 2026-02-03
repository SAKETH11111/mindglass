import { useState } from "react";
import { motion } from "framer-motion";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { AppFooter } from "./AppFooter";
import { CommandPalette } from "./CommandPalette";
import { Toaster } from "@/components/ui/sonner";

interface V1LayoutProps {
  children: React.ReactNode;
}

export function V1Layout({ children }: V1LayoutProps) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Wafer grid pattern */}
        <div className="absolute inset-0 wafer-grid opacity-50" />
        
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(241, 90, 41, 0.08) 0%, transparent 70%)",
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61, 138, 138, 0.06) 0%, transparent 70%)",
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Subtle vignette */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 0%, rgba(26, 26, 26, 0.4) 100%)",
          }}
        />
      </div>

      {/* Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <SidebarInset className="flex flex-col min-h-screen bg-transparent relative z-10">
        {/* Header */}
        <AppHeader onCommandOpen={() => setCommandOpen(true)} />

        {/* Main content */}
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>

        {/* Footer */}
        <AppFooter status="ready" />
      </SidebarInset>

      {/* Command palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

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
    </SidebarProvider>
  );
}
