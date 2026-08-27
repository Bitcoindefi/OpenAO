"use client";

import React, { useState, useEffect, useRef } from "react";

interface MobileTouchControlsProps {
  onDirectionChange?: (direction: { x: number; y: number } | null) => void;
  onAttack?: () => void;
  onCastSpell?: () => void;
  onUseItem?: () => void;
  onToggleSafe?: () => void;
  onOpenChat?: () => void;
}

export function MobileTouchControls({
  onDirectionChange,
  onAttack,
  onCastSpell,
  onUseItem,
  onToggleSafe,
  onOpenChat
}: MobileTouchControlsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
      setIsMobile(isTouch || window.innerWidth < 900);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);
    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  if (!isMobile) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickBaseRef.current) return;
    const touch = e.touches[0];
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const maxRadius = rect.width / 2;

    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);

    const normX = clampedDist > 10 ? Math.cos(angle) : 0;
    const normY = clampedDist > 10 ? Math.sin(angle) : 0;

    setStickPosition({
      x: Math.cos(angle) * clampedDist,
      y: Math.sin(angle) * clampedDist
    });

    onDirectionChange?.({ x: normX, y: normY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setStickPosition({ x: 0, y: 0 });
    onDirectionChange?.(null);
  };

  return (
    <>
      {/* Orientation Warning */}
      {isPortrait && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="text-4xl mb-3 animate-bounce">📱 🔄</div>
          <h2 className="text-lg font-bold mb-1">Gira tu pantalla</h2>
          <p className="text-xs text-slate-300 max-w-xs">
            OpenAO está optimizado para jugarse en modo horizontal (Landscape). Gira tu dispositivo para comenzar.
          </p>
        </div>
      )}

      {/* Floating Virtual Joystick (Left) */}
      <div className="fixed bottom-6 left-6 z-[500] select-none touch-none">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="w-28 h-28 rounded-full bg-slate-900/60 border-2 border-slate-700/80 backdrop-blur flex items-center justify-center relative shadow-2xl"
        >
          {/* Stick */}
          <div
            style={{
              transform: `translate(${stickPosition.x}px, ${stickPosition.y}px)`
            }}
            className={`w-12 h-12 rounded-full bg-indigo-500/80 border border-indigo-300 shadow-md transition-transform duration-75 ${
              isDragging ? "scale-110 bg-indigo-400" : ""
            }`}
          />
        </div>
      </div>

      {/* Action Buttons (Right) */}
      <div className="fixed bottom-6 right-6 z-[500] select-none flex flex-col items-end gap-3 pointer-events-auto">
        <div className="flex gap-2">
          <button
            onTouchStart={(e) => { e.preventDefault(); onToggleSafe?.(); }}
            className="w-12 h-12 rounded-full bg-amber-600/80 active:bg-amber-500 border border-amber-300 text-white font-bold text-xs shadow-lg flex items-center justify-center backdrop-blur"
          >
            🛡️
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); onOpenChat?.(); }}
            className="w-12 h-12 rounded-full bg-slate-800/80 active:bg-slate-700 border border-slate-600 text-white font-bold text-xs shadow-lg flex items-center justify-center backdrop-blur"
          >
            💬
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onTouchStart={(e) => { e.preventDefault(); onUseItem?.(); }}
            className="w-14 h-14 rounded-full bg-emerald-600/80 active:bg-emerald-500 border border-emerald-300 text-white font-bold text-xs shadow-xl flex items-center justify-center backdrop-blur"
          >
            🧪 Usar
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); onCastSpell?.(); }}
            className="w-14 h-14 rounded-full bg-purple-600/80 active:bg-purple-500 border border-purple-300 text-white font-bold text-xs shadow-xl flex items-center justify-center backdrop-blur"
          >
            ✨ Hechizo
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); onAttack?.(); }}
            className="w-16 h-16 rounded-full bg-rose-600/90 active:bg-rose-500 border-2 border-rose-300 text-white font-black text-sm shadow-2xl flex items-center justify-center backdrop-blur"
          >
            ⚔️
          </button>
        </div>
      </div>
    </>
  );
}
