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

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 640;

    const size = () => {
      const s = Math.min(window.innerWidth, isMobile ? 280 : 400);
      canvas.width = s;
      canvas.height = s;
    };
    size();
    window.addEventListener("resize", size);

    let animId: number;
    let lastTime = 0;
    const animate = (time: number) => {
      // Throttle to 30fps on mobile for performance
      if (isMobile && time - lastTime < 33) {
        animId = requestAnimationFrame(animate);
        return;
      }
      lastTime = time;

      angleRef.current += prefersReducedMotion ? 0.002 : 0.008;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = canvas.width * 0.35;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pulse = listening ? 1 + 0.08 * Math.sin(angleRef.current * 3) : 1;

      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 212, 255, ${active ? 0.25 : 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const startAngle = angleRef.current;
      const endAngle = startAngle + 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, startAngle, endAngle);
      ctx.strokeStyle = `rgba(0, 212, 255, ${active ? 0.7 : 0.3})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = active ? 15 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const startAngle2 = -angleRef.current + 2;
      const endAngle2 = startAngle2 + 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.85 * pulse, startAngle2, endAngle2);
      ctx.strokeStyle = `rgba(0, 212, 255, ${active ? 0.5 : 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = active ? 10 : 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 212, 255, ${active ? 0.15 : 0.06})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      const dotSize = listening ? 3 + 2 * Math.sin(angleRef.current * 4) : 3;
      ctx.beginPath();
      ctx.arc(cx, cy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${active ? 0.9 : 0.4})`;
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = active ? 20 : 5;
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", size);
    };
  }, [active, listening]);

  return (
    <div className="flex justify-center items-center py-4 sm:py-6 md:py-8">
      <canvas
        ref={canvasRef}
        className="max-w-[200px] xs:max-w-[240px] sm:max-w-[280px] md:max-w-[350px] w-full h-auto"
        style={{ filter: "drop-shadow(0 0 30px rgba(0,212,255,0.15))" }}
      />
    </div>
  );
}
