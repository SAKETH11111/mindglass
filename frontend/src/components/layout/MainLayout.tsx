import type { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-mindglass flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-coral/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal/10 rounded-full blur-[120px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">
        {/* Logo/Title */}
        <h1 className="text-5xl font-bold mb-2 gradient-text tracking-tight">
          MindGlass
        </h1>
        <p className="text-text-secondary text-sm mb-12 font-medium tracking-wide">
          Multi-Agent Debate Visualization
        </p>

        {/* Content area */}
        {children}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-text-muted text-xs">
        <span className="text-coral">●</span> Powered by Cerebras
      </div>
    </div>
  );
}
