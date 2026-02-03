import { motion } from "framer-motion";
import type { Phase } from "@/types/agent";

interface TheaterBackgroundProps {
  phase?: Phase;
  intensity?: number;
}

// Subtle color shifts based on debate phase
const PHASE_COLORS: Record<Phase, { primary: string; secondary: string }> = {
  idle: { primary: "rgba(241, 90, 41, 0.03)", secondary: "rgba(61, 138, 138, 0.02)" },
  dispatch: { primary: "rgba(241, 90, 41, 0.06)", secondary: "rgba(255, 152, 93, 0.03)" },
  conflict: { primary: "rgba(255, 107, 107, 0.05)", secondary: "rgba(255, 152, 93, 0.04)" },
  synthesis: { primary: "rgba(168, 118, 232, 0.05)", secondary: "rgba(122, 196, 217, 0.03)" },
  convergence: { primary: "rgba(146, 232, 73, 0.04)", secondary: "rgba(78, 205, 196, 0.03)" },
  complete: { primary: "rgba(146, 232, 73, 0.04)", secondary: "rgba(78, 205, 196, 0.03)" },
};

export function TheaterBackground({ phase = "idle", intensity = 1 }: TheaterBackgroundProps) {
  const colors = PHASE_COLORS[phase];
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Base gradient - very subtle */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, ${colors.primary}, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 100%, ${colors.secondary}, transparent 40%),
            radial-gradient(ellipse 50% 30% at 0% 50%, ${colors.secondary}, transparent 30%)
          `,
          opacity: intensity,
        }}
      />

      {/* Floating orb 1 */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.primary}, transparent 60%)`,
          top: "-20%",
          left: "-10%",
          filter: "blur(80px)",
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating orb 2 */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.secondary}, transparent 60%)`,
          bottom: "-15%",
          right: "-10%",
          filter: "blur(60px)",
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle grid pattern - very faint */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Noise texture overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette for theatrical feel */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </div>
  );
}
