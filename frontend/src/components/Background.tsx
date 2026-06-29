import { useEffect, useRef, useMemo } from "react";

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useMemo(() => {
    const arr: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    for (let i = 0; i < 50; i++) {
      arr.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.5 + 0.1,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${p.o})`;
        ctx.fill();
      }
      // Draw connections for nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - dist / 120) * 0.08})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [particles]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,229,255,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 30% 70%, rgba(59,130,246,0.04) 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 70% 30%, rgba(0,255,200,0.03) 0%, transparent 50%)",
        }}
      />

      {/* Animated gradient orbs */}
      <div
        className="absolute rounded-full"
        style={{
          width: "60vmax",
          height: "60vmax",
          top: "20%",
          left: "30%",
          background: "radial-gradient(circle, rgba(0,229,255,0.03) 0%, transparent 60%)",
          animation: "gradient-shift 12s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "40vmax",
          height: "40vmax",
          bottom: "10%",
          right: "10%",
          background: "radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 50%)",
          animation: "gradient-shift 8s ease-in-out infinite reverse",
        }}
      />

      {/* Subtle scan line */}
      <div
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px)",
          pointerEvents: "none",
        }}
      />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
