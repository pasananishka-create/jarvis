import { useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";

interface AICoreProps {
  state?: "idle" | "listening" | "thinking" | "speaking" | "success" | "error";
  size?: number;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  hue: number;
  pulse: number;
  trail: { x: number; y: number }[];
}

export default function AICore({ state = "idle", size = 200 }: AICoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const s = size;

  // Track device orientation or mouse for physics-based movement
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if ("touches" in e && e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX / w, y: e.touches[0].clientY / h };
      } else if ("clientX" in e) {
        mouseRef.current = { x: e.clientX / w, y: e.clientY / h };
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
    };
  }, []);

  const particles = useMemo(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      arr.push({
        angle: Math.random() * Math.PI * 2,
        radius: s * 0.12 + Math.random() * s * 0.25,
        speed: (Math.random() - 0.5) * 0.025,
        size: Math.random() * 2.5 + 0.5,
        hue: Math.random() * 60 + 160,
        pulse: Math.random() * Math.PI * 2,
        trail: [],
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
    const stateIn = state === "listening" ? 2 : state === "thinking" ? 1.5 : 1;
    const stateSpeed = state === "thinking" ? 1.5 : state === "listening" ? 0.8 : 1;

    const draw = () => {
      time += 0.02 * stateSpeed;
      ctx.clearRect(0, 0, s, s);

      const mx = (mouseRef.current.x - 0.5) * s * 0.04;
      const my = (mouseRef.current.y - 0.5) * s * 0.04;
      const cx = s / 2 + mx;
      const cy = s / 2 + my;

      // Outer glow bloom
      const glowSize = s * 0.55 + Math.sin(time * 0.5) * s * 0.03;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
      grad.addColorStop(0, `rgba(0,229,255,${0.1 * stateIn})`);
      grad.addColorStop(0.3, `rgba(0,229,255,${0.05 * stateIn})`);
      grad.addColorStop(0.7, `rgba(59,130,246,${0.02 * stateIn})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      // Scanning arc
      const scanAngle = time * 0.4;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(scanAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, s * 0.45, -0.15, 0.15);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,229,255,0.04)";
      ctx.fill();
      ctx.restore();

      // Scanning arc 2 (opposite)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-scanAngle + Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, s * 0.4, -0.1, 0.1);
      ctx.closePath();
      ctx.fillStyle = "rgba(59,130,246,0.03)";
      ctx.fill();
      ctx.restore();

      // Pulse rings
      for (let i = 0; i < 3; i++) {
        const pr = s * (0.25 + i * 0.12) + Math.sin(time * 1.2 + i * 1.5) * s * 0.03;
        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${i === 1 ? "59,130,246" : "0,229,255"},${(0.06 + Math.sin(time * 1.2 + i) * 0.03) * stateIn})`;
        ctx.lineWidth = 0.5 - i * 0.1;
        ctx.stroke();
      }

      // Dashed rotating ring 1
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,229,255,${0.15 * stateIn})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Dashed rotating ring 2
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * -0.22 + 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59,130,246,${0.12 * stateIn})`;
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Solid thin ring 3 (inner)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,255,200,${0.08 * stateIn})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();
      ctx.restore();

      // Orbit particles with trails
      for (const p of particles) {
        const a = p.angle + time * p.speed * 3;
        const r = p.radius + Math.sin(time + p.pulse) * 6;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        const alpha = (0.3 + Math.sin(time * 2 + p.pulse) * 0.2) * stateIn;

        // Trail
        p.trail.push({ x: px, y: py });
        if (p.trail.length > 6) p.trail.shift();
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.3})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.fill();
      }

      // Light streaks (fast orbiting dots)
      for (let i = 0; i < 4; i++) {
        const sa = time * 0.8 + i * Math.PI / 2;
        const sr = s * 0.35 + Math.sin(time * 1.5 + i) * s * 0.05;
        const sx = cx + Math.cos(sa) * sr;
        const sy = cy + Math.sin(sa) * sr;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${0.6 * stateIn})`;
        ctx.fill();
      }

      // Center glow
      const cgSize = s * (0.12 + Math.sin(time * 0.8) * 0.02);
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cgSize);
      centerGrad.addColorStop(0, `rgba(0, 229, 255, ${0.2 * stateIn})`);
      centerGrad.addColorStop(0.4, `rgba(0, 229, 255, ${0.08 * stateIn})`);
      centerGrad.addColorStop(0.7, `rgba(59, 130, 246, ${0.03 * stateIn})`);
      centerGrad.addColorStop(1, "transparent");
      ctx.fillStyle = centerGrad;
      ctx.fillRect(cx - cgSize, cy - cgSize, cgSize * 2, cgSize * 2);

      // Center dot
      const dotSize = (2 + Math.sin(time) * 0.5) * stateIn;
      ctx.beginPath();
      ctx.arc(cx, cy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = "#00E5FF";
      ctx.shadowColor = "rgba(0, 229, 255, 0.6)";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // HUD markers
      const markerR = s * 0.43;
      for (let i = 0; i < 4; i++) {
        const ma = time * 0.1 + i * Math.PI / 2;
        const mx2 = cx + Math.cos(ma) * markerR;
        const my2 = cy + Math.sin(ma) * markerR;
        ctx.beginPath();
        ctx.arc(mx2, my2, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${(0.2 + Math.sin(time + i) * 0.1) * stateIn})`;
        ctx.fill();
        // Tiny crosshair
        ctx.beginPath();
        ctx.moveTo(mx2 - 3, my2);
        ctx.lineTo(mx2 + 3, my2);
        ctx.moveTo(mx2, my2 - 3);
        ctx.lineTo(mx2, my2 + 3);
        ctx.strokeStyle = `rgba(0,229,255,${(0.08 + Math.sin(time + i) * 0.04) * stateIn})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [s, particles, state]);

  const stateMotion = {
    idle: {},
    listening: { scale: [1, 1.04, 1] as any },
    thinking: { scale: [1, 1.015, 1, 1.015, 1] as any },
    speaking: { scale: [1, 1.025, 0.98, 1.025, 1] as any },
    success: { scale: [1, 1.08, 1] as any },
    error: { scale: [1, 0.96, 1, 0.96, 1] as any },
  };

  return (
    <motion.div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: s,
        height: s,
        boxShadow: `0 0 ${s * 0.4}px rgba(0,229,255,0.12), 0 0 ${s * 0.15}px rgba(0,229,255,0.06), inset 0 0 ${s * 0.2}px rgba(0,229,255,0.03)`,
      }}
      animate={stateMotion[state]}
      transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </motion.div>
  );
}
