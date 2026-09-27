"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  hue: number; // 0=cyan, 1=violet, 2=blue
  pulseSpeed: number;
  pulsePhase: number;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const frameRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    const MOUSE_RADIUS = 200;
    const MOUSE_PUSH = 2.5;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const count = Math.min(120, Math.floor((canvas.width * canvas.height) / 12000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.8,
        baseOpacity: Math.random() * 0.4 + 0.15,
        opacity: 0,
        hue: Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulsePhase: Math.random() * Math.PI * 2,
      }));
    };

    const colors = [
      [0, 240, 255],   // cyan
      [139, 92, 246],   // violet
      [56, 189, 248],   // sky blue
    ];

    let time = 0;

    const draw = () => {
      time += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_PUSH;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Clamp velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1.5) {
          p.vx = (p.vx / speed) * 1.5;
          p.vy = (p.vy / speed) * 1.5;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Pulse opacity
        p.opacity = p.baseOpacity + Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.1;

        // Draw particle
        const [r, g, b] = colors[p.hue];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity * 0.15})`;
        ctx.fill();
      }

      // Draw connections (optimized: only check nearby particles)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;

          if (dist < 18000) { // ~134px
            const d = Math.sqrt(dist);
            const alpha = (1 - d / 134) * 0.12;

            // Highlight connections near mouse
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const mouseD = Math.sqrt((midX - mx) ** 2 + (midY - my) ** 2);
            const mouseBoost = mouseD < MOUSE_RADIUS ? (1 - mouseD / MOUSE_RADIUS) * 0.15 : 0;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha + mouseBoost})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw mouse glow
      if (mx > 0 && my > 0) {
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_RADIUS);
        gradient.addColorStop(0, "rgba(0, 240, 255, 0.04)");
        gradient.addColorStop(1, "rgba(0, 240, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(mx - MOUSE_RADIUS, my - MOUSE_RADIUS, MOUSE_RADIUS * 2, MOUSE_RADIUS * 2);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    window.addEventListener("resize", () => { resize(); createParticles(); });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", () => { resize(); createParticles(); });
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
