import { useEffect, useRef } from "react";

interface HolographicRingProps {
  active: boolean;
  listening?: boolean;
}

export default function HolographicRing({ active, listening }: HolographicRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 640;

    const size = () => {
      const s = Math.min(window.innerWidth, isMobile ? 240 : 340);
      canvas.width = s;
      canvas.height = s;
    };
    size();
    window.addEventListener("resize", size);

    let animId: number;
    let lastTime = 0;

    const draw = (time: number) => {
      if (isMobile && time - lastTime < 33) {
        animId = requestAnimationFrame(draw);
        return;
      }
      lastTime = time;

      const speed = prefersReducedMotion ? 0.002 : 0.006;
      angleRef.current += speed;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = canvas.width * 0.35;
      const a = angleRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pulse = listening ? 1 + 0.06 * Math.sin(a * 3) : 1;
      const baseAlpha = active ? 0.2 : 0.08;
      const glowAlpha = active ? 0.6 : 0.2;

      // Outer faint ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${baseAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Main rotating arc
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, a, a + 1.0);
      ctx.strokeStyle = `rgba(0, 200, 255, ${glowAlpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00c8ff";
      ctx.shadowBlur = active ? 20 : 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Secondary arc (opposite)
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.85 * pulse, -a + 1.5, -a + 2.2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${glowAlpha * 0.7})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00c8ff";
      ctx.shadowBlur = active ? 14 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${baseAlpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Center glow
      const dotSize = listening ? 2.5 + 1.5 * Math.sin(a * 4) : 2.5;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotSize * 3);
      grad.addColorStop(0, `rgba(0, 200, 255, ${active ? 0.9 : 0.3})`);
      grad.addColorStop(1, `rgba(0, 200, 255, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, dotSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 200, 255, ${active ? 0.9 : 0.3})`;
      ctx.shadowColor = "#00c8ff";
      ctx.shadowBlur = active ? 25 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", size);
    };
  }, [active, listening]);

  return (
    <div className="flex justify-center items-center py-3 sm:py-7 md:py-9">
      <canvas
        ref={canvasRef}
        className="max-w-[140px] sm:max-w-[240px] md:max-w-[300px] w-full h-auto"
        style={{ filter: "drop-shadow(0 0 40px rgba(0,200,255,0.12))" }}
      />
    </div>
  );
}
