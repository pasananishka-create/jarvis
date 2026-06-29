import { useEffect, useRef } from "react";

interface BackgroundProps {
  particleCount?: number;
  quality?: "low" | "medium" | "high";
}

export default function Background({ particleCount = 60, quality = "high" }: BackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);

  const starCount = quality === "low" ? 0 : quality === "medium" ? 40 : 80;
  const particleMult = quality === "low" ? 0.5 : quality === "medium" ? 0.75 : 1;
  const totalParticles = Math.round(particleCount * particleMult);

  // Star field canvas (static, drawn once)
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas || starCount === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.2 + 0.3;
      const alpha = Math.random() * 0.4 + 0.1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }, [starCount]);

  // Particle canvas (animated)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const dpr = window.devicePixelRatio || 1;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    interface FloatingParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
    }

    const particles: FloatingParticle[] = [];
    for (let i = 0; i < totalParticles; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.25 + 0.05,
        hue: Math.random() * 60 + 170,
      });
    }

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", resize);

    const maxDist = 100;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw energy wave (subtle horizontal band)
      const wavePhase = Date.now() * 0.001;
      for (let i = 0; i < 3; i++) {
        const waveY = h * 0.3 + Math.sin(wavePhase * 0.5 + i * 2) * h * 0.2;
        ctx.beginPath();
        for (let x = 0; x < w; x += 20) {
          const y = waveY + Math.sin(x * 0.008 + wavePhase + i * 1.5) * 15;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.015 + Math.sin(wavePhase * 0.3 + i) * 0.008})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Grid overlay
      ctx.strokeStyle = "rgba(0, 229, 255, 0.02)";
      ctx.lineWidth = 0.3;
      const gridSize = 40;
      for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Update and draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const pulse = 0.5 + Math.sin(Date.now() * 0.002 + p.x * 0.01) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.alpha * (0.6 + pulse * 0.4)})`;
        ctx.fill();

        // Connection lines
        for (const p2 of particles) {
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${0.05 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 0.3;
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
  }, [totalParticles]);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* Gradient orbs */}
      <div
        className="absolute rounded-full"
        style={{
          width: "60vw",
          height: "60vw",
          top: "-20%",
          right: "-20%",
          background:
            "radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%)",
          animation: "gradientShift 12s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "50vw",
          height: "50vw",
          bottom: "-15%",
          left: "-15%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.035) 0%, transparent 70%)",
          animation: "gradientShift 15s ease-in-out infinite alternate-reverse",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "40vw",
          height: "40vw",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(circle, rgba(0,255,200,0.025) 0%, transparent 70%)",
          animation: "gradientShift 18s ease-in-out infinite alternate",
        }}
      />
      {/* Scan line overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.008) 2px, rgba(0,229,255,0.008) 4px)",
          backgroundSize: "100% 4px",
        }}
      />
      {/* Noise texture */}
      {quality === "high" && (
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.03,
            mixBlendMode: "overlay",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "256px 256px",
          }}
        />
      )}
      {/* Star field */}
      <canvas
        ref={starCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.8 }}
      />
      {/* Particle + grid + wave canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
