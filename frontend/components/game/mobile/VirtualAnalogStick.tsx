"use client";

import { useCallback, useRef, useState } from "react";
import { TOUCH_STICK_DEAD_ZONE } from "../../../lib/mobile/playability";

type VirtualAnalogStickProps = {
    onVector: (x: number, y: number) => void;
    onRelease: () => void;
    size?: number;
};

export default function VirtualAnalogStick({
    onVector,
    onRelease,
    size = 128,
}: VirtualAnalogStickProps) {
    const baseRef = useRef<HTMLDivElement | null>(null);
    const pointerIdRef = useRef<number | null>(null);
    const [thumb, setThumb] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);

    const updateFromClient = useCallback(
        (clientX: number, clientY: number) => {
            const base = baseRef.current;
            if (!base) {
                return;
            }

            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            const radius = size / 2;
            const distance = Math.hypot(dx, dy);
            const clamped = Math.min(distance, radius);
            const angle = Math.atan2(dy, dx);
            const thumbX = Math.cos(angle) * clamped;
            const thumbY = Math.sin(angle) * clamped;
            const normX = distance > 0 ? (dx / distance) * (clamped / radius) : 0;
            const normY = distance > 0 ? (dy / distance) * (clamped / radius) : 0;

            setThumb({ x: thumbX, y: thumbY });

            if (Math.hypot(normX, normY) < TOUCH_STICK_DEAD_ZONE) {
                onVector(0, 0);
                return;
            }

            onVector(normX, normY);
        },
        [onVector, size],
    );

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (pointerIdRef.current !== null) {
                return;
            }

            pointerIdRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            setActive(true);
            updateFromClient(event.clientX, event.clientY);
            event.preventDefault();
            event.stopPropagation();
        },
        [updateFromClient],
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (pointerIdRef.current !== event.pointerId) {
                return;
            }

            updateFromClient(event.clientX, event.clientY);
            event.preventDefault();
            event.stopPropagation();
        },
        [updateFromClient],
    );

    const endPointer = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (pointerIdRef.current !== event.pointerId) {
                return;
            }

            pointerIdRef.current = null;
            setActive(false);
            setThumb({ x: 0, y: 0 });
            onRelease();
            event.preventDefault();
            event.stopPropagation();
        },
        [onRelease],
    );

    return (
        <div
            ref={baseRef}
            className="touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            style={{
                width: size,
                height: size,
                borderRadius: "9999px",
                border: "2px solid rgba(165, 243, 252, 0.35)",
                background: active
                    ? "rgba(8, 47, 73, 0.72)"
                    : "rgba(2, 6, 23, 0.55)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                position: "relative",
                backdropFilter: "blur(6px)",
            }}
            aria-label="Joystick de movimiento"
        >
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: size * 0.38,
                    height: size * 0.38,
                    marginLeft: -(size * 0.19),
                    marginTop: -(size * 0.19),
                    borderRadius: "9999px",
                    background: "rgba(103, 232, 249, 0.75)",
                    border: "1px solid rgba(224, 242, 254, 0.7)",
                    transform: `translate(${thumb.x}px, ${thumb.y}px)`,
                    transition: active ? "none" : "transform 120ms ease-out",
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}
