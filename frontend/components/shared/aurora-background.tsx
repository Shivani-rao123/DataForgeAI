"use client";

import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
  className?: string;
}

export function AuroraBackground({ className }: AuroraBackgroundProps) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}>
      {/* Cyan blob */}
      <div
        className="absolute -top-1/4 -left-1/4 h-[800px] w-[800px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%)",
          animation: "float 20s ease-in-out infinite",
        }}
      />
      {/* Violet blob */}
      <div
        className="absolute -right-1/4 top-1/3 h-[600px] w-[600px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
          animation: "float 25s ease-in-out infinite reverse",
        }}
      />
      {/* Subtle rose accent */}
      <div
        className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(244,63,94,0.3) 0%, transparent 70%)",
          animation: "float 30s ease-in-out infinite",
        }}
      />
    </div>
  );
}
