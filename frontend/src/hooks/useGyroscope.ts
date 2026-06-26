import { useState, useEffect, useRef } from "react";

interface GyroData {
  x: number;
  y: number;
}

export function useGyroscope(maxShift = 8, damping = 0.15) {
  const [offset, setOffset] = useState<GyroData>({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const reduced = useRef(false);
  const raf = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    if (reduced.current) return;

    // Gyroscope handler
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // gamma: left(-90) to right(90), beta: front(-180) to back(180)
      const x = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
      const y = Math.max(-1, Math.min(1, ((e.beta || 0) - 0) / 45));
      target.current = { x, y };
    };

    // Fallback: mouse move for desktop
    const handleMouse = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      target.current = {
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / cx)),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / cy)),
      };
    };

    const step = () => {
      current.current.x += (target.current.x - current.current.x) * damping;
      current.current.y += (target.current.y - current.current.y) * damping;
      setOffset({
        x: Math.round(current.current.x * maxShift * 10) / 10,
        y: Math.round(current.current.y * maxShift * 10) / 10,
      });
      raf.current = requestAnimationFrame(step);
    };

    // Request permission for iOS 13+
    const requestPermission = async () => {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function"
      ) {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          } else {
            window.addEventListener("mousemove", handleMouse);
          }
        } catch {
          window.addEventListener("mousemove", handleMouse);
        }
      } else if (typeof DeviceOrientationEvent !== "undefined") {
        window.addEventListener("deviceorientation", handleOrientation);
      } else {
        window.addEventListener("mousemove", handleMouse);
      }
    };

    requestPermission();
    raf.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, [maxShift, damping]);

  return offset;
}
