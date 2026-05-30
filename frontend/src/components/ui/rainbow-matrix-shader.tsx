import { cn } from "@/lib/utils";

export function RainbowMatrixShader({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 z-0 overflow-hidden bg-[#050505]", className)}>
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        src="/screen_recording_background.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(5,5,5,0),rgba(5,5,5,0.18)_38%,rgba(5,5,5,0.58)_76%,rgba(5,5,5,0.86)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/18 via-transparent to-[#050505]/70" />
      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
