"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type JoystickProps = {
  onMove: (angle: number, force: number) => void;
  onMoveEnd: () => void;
  size?: number;
};

/**
 * Floating virtual joystick for touch/mobile input.
 *
 * Renders a circular base + thumb that follows the user's finger.
 * Reports movement angle and force via onMove, and calls onMoveEnd when released.
 * Designed to be absolutely positioned over the game canvas.
 */
export default function Joystick({
  onMove,
  onMoveEnd,
  size = 140,
}: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const baseCenter = useRef({ x: 0, y: 0 });
  const touchId = useRef<number | null>(null);
  const animFrame = useRef<number>(0);

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current || !thumbRef.current) return;

      const dx = clientX - baseCenter.current.x;
      const dy = clientY - baseCenter.current.y;
      const radius = size / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(distance, radius);

      const angle = Math.atan2(dy, dx);
      const force = clamped / radius;

      // Clamp thumb position to base radius
      const thumbX = Math.cos(angle) * clamped;
      const thumbY = Math.sin(angle) * clamped;
      thumbRef.current.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

      onMove(angle, force);
    },
    [onMove, size],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (touchId.current !== null) return;
      const touch = e.changedTouches[0];
      touchId.current = touch.identifier;

      if (baseRef.current) {
        const rect = baseRef.current.getBoundingClientRect();
        baseCenter.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      setActive(true);
      updatePosition(touch.clientX, touch.clientY);
    },
    [updatePosition],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId.current) {
          updatePosition(touch.clientX, touch.clientY);
          break;
        }
      }
    },
    [updatePosition],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null;
          setActive(false);
          if (thumbRef.current) {
            thumbRef.current.style.transform = `translate(0px, 0px)`;
          }
          onMoveEnd();
          break;
        }
      }
    },
    [onMoveEnd],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrame.current) {
        cancelAnimationFrame(animFrame.current);
      }
    };
  }, []);

  return (
    <div
      ref={baseRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "absolute",
        bottom: 80,
        left: 40,
        width: size,
        height: size,
        borderRadius: "50%",
        background: active
          ? "rgba(255,255,255,0.2)"
          : "rgba(255,255,255,0.1)",
        border: "2px solid rgba(255,255,255,0.3)",
        touchAction: "none",
        zIndex: 100,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <div
        ref={thumbRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.4)",
          transform: "translate(-50%, -50%)",
          marginLeft: -20,
          marginTop: -20,
          transition: active ? "none" : "transform 0.15s ease-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}