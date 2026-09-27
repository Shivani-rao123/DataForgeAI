"use client";

import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: "cyan" | "warm" | "emerald";
}

export function GradientText({
  children,
  className,
  variant = "cyan",
}: GradientTextProps) {
  const gradients = {
    cyan: "from-cyan to-violet",
    warm: "from-violet to-rose",
    emerald: "from-emerald to-cyan",
  };

  return (
    <span
      className={cn(
        "bg-gradient-to-r bg-clip-text text-transparent",
        gradients[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
