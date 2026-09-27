"use client";

import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "violet" | "emerald" | "rose";
  hover?: boolean;
}

export function GlowCard({
  children,
  className,
  glowColor = "cyan",
  hover = true,
}: GlowCardProps) {
  const glows = {
    cyan: "hover:border-cyan/30 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]",
    violet:
      "hover:border-violet/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
    emerald:
      "hover:border-emerald/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    rose: "hover:border-rose/30 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]",
  };

  return (
    <div
      className={cn(
        "glass-card transition-all duration-500",
        hover && glows[glowColor],
        className
      )}
    >
      {children}
    </div>
  );
}
