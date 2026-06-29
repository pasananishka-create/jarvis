import { useRef, useState, useCallback, type MouseEvent, type TouchEvent } from "react";
import { motion } from "framer-motion";

interface Ripple {
  x: number;
  y: number;
  id: number;
  size: number;
}

interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

export default function RippleButton({
  children,
  onClick,
  style,
  className,
  disabled,
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);

  const createRipple = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const size = Math.max(rect.width, rect.height) * 1.5;
      const x = clientX - rect.left - size / 2;
      const y = clientY - rect.top - size / 2;
      const id = idRef.current++;
      setRipples((prev) => [...prev, { x, y, id, size }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 700);
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      createRipple(e.clientX, e.clientY, rect);
    },
    [createRipple, disabled]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      createRipple(e.touches[0].clientX, e.touches[0].clientY, rect);
    },
    [createRipple, disabled]
  );

  return (
    <motion.button
      className={className}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      disabled={disabled}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            borderRadius: "50%",
            background: "rgba(0,229,255,0.15)",
            pointerEvents: "none",
            animation: "rippleExpand 0.7s ease-out forwards",
          }}
        />
      ))}
    </motion.button>
  );
}
