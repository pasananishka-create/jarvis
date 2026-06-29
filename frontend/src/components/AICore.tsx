import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";

interface AICoreProps {
  state?: "idle" | "listening" | "thinking" | "speaking" | "success" | "error";
  size?: number;
}

export default function AICore({ state = "idle", size = 200 }: AICoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const s = size;

  const particles = useMemo(() => {
    const arr: {
      angle: number;
      radius: number;
      speed: number;
      size: number;
      hue: number;
      pulse: number;
    }[] = [];
    for (let i = 0; i < 30; i++) {
      arr.push({
        angle: Math.random() * Math.PI * 2,
        radius: s * 0.15 + Math.random() * s * 0.2,
        speed: (Math.random() - 0.5) * 0.02,
        size: Math.random() * 2 + 0.5,
        hue: Math.random() * 40 + 170,
        pulse: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [s]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = s * dpr;
    canvas.height = s * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const draw = () => {
      time += 0.02;
      ctx.clearRect(0, 0, s, s);

      const cx = s / 2;
      const cy = s / 2;

      // Outer glow
      const glowSize = s * 0.5 + Math.sin(time * 0.5) * s * 0.02;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
      grad.addColorStop(0, "rgba(0,229,255,0.08)");
      grad.addColorStop(0.5, "rgba(0,229,255,0.03)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      // Pulse ring
      const pulseR = s * 0.4 + Math.sin(time * 1.5) * s * 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,229,255,${0.08 + Math.sin(time * 1.5) * 0.04})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Second pulse ring
      const pulseR2 = s * 0.3 + Math.sin(time * 1.2 + 1) * s * 0.04;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59,130,246,${0.06 + Math.sin(time * 1.2) * 0.03})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();

      // Rotating ring 1
      const angle1 = time * 0.3;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle1);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,229,255,${0.12 + Math.sin(time * 0.5) * 0.04})`;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Rotating ring 2 (opposite direction)
      const angle2 = time * -0.2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle2);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59,130,246,${0.1 + Math.sin(time * 0.7) * 0.03})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();

      // Orbit particles
      for (const p of particles) {
        const a = p.angle + time * p.speed * 2;
        const r = p.radius + Math.sin(time + p.pulse) * 5;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const alpha = 0.3 + Math.sin(time * 2 + p.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.fill();
      }

      // Center glow
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.12);
      centerGrad.addColorStop(0, "rgba(0, 229, 255, 0.15)");
      centerGrad.addColorStop(0.5, "rgba(0, 229, 255, 0.05)");
      centerGrad.addColorStop(1, "transparent");
      ctx.fillStyle = centerGrad;
      ctx.fillRect(cx - s * 0.12, cy - s * 0.12, s * 0.24, s * 0.24);

      // Center dot
      const dotSize = 2 + Math.sin(time) * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 229, 255, 0.8)";
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [s, particles]);

  const stateMotion = {
    idle: {},
    listening: { scale: [1, 1.05, 1] as any },
    thinking: { scale: [1, 1.02, 1, 1.02, 1] as any },
    speaking: { scale: [1, 1.03, 0.98, 1.03, 1] as any },
    success: { scale: [1, 1.1, 1] as any },
    error: { scale: [1, 0.95, 1, 0.95, 1] as any },
  };

  return (
    <motion.div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: s,
        height: s,
        boxShadow: `0 0 ${s * 0.3}px rgba(0,229,255,0.1), inset 0 0 ${s * 0.15}px rgba(0,229,255,0.03)`,
      }}
      animate={stateMotion[state]}
      transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </motion.div>
  );
}
