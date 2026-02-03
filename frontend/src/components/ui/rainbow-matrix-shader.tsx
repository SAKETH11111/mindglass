import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import UnicornScene from "unicornstudio-react";

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

export function RainbowMatrixShader({ className }: { className?: string }) {
  const { width, height } = useWindowSize();

  return (
    <div className={cn("fixed inset-0 z-0 overflow-hidden", className)}>
      {/* Base dark background */}
      <div className="absolute inset-0 bg-[#050505]" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0">
        {/* Purple orb - top left */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.6) 0%, transparent 70%)',
            top: '-10%',
            left: '-10%',
            animation: 'float1 20s ease-in-out infinite',
          }}
        />
        {/* Cyan orb - bottom right */}
        <div 
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.5) 0%, transparent 70%)',
            bottom: '-5%',
            right: '-5%',
            animation: 'float2 25s ease-in-out infinite',
          }}
        />
        {/* Pink orb - center */}
        <div 
          className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, transparent 70%)',
            top: '40%',
            left: '30%',
            animation: 'float3 18s ease-in-out infinite',
          }}
        />
        {/* Orange orb - top right */}
        <div 
          className="absolute w-[350px] h-[350px] rounded-full blur-[90px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.4) 0%, transparent 70%)',
            top: '10%',
            right: '20%',
            animation: 'float1 22s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* UnicornStudio Scene - overlays the gradient */}
      <div className="absolute inset-0 mix-blend-screen">
        <UnicornScene 
          production={true} 
          projectId="jYxrWzSRtsXNqZADHnVH" 
          width={width} 
          height={height}
        />
      </div>

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

