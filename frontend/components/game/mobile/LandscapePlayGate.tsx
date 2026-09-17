"use client";

import { useEffect, useState } from "react";
import { shouldRequireLandscape } from "../../../lib/mobile/playability";

/**
 * Portrait overlay for compact play. Does not remount the game tree —
 * rotation must not drop the WebSocket session.
 */
export default function LandscapePlayGate({ enabled }: { enabled: boolean }) {
    const [portrait, setPortrait] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setPortrait(false);
            return;
        }

        const update = () => {
            setPortrait(
                shouldRequireLandscape(window.innerWidth, window.innerHeight),
            );
        };

        update();
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
        };
    }, [enabled]);

    if (!enabled || !portrait) {
        return null;
    }

    return (
        <div className="pointer-events-auto fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-slate-950/95 px-8 text-center text-stone-100">
            <div className="text-3xl" aria-hidden>
                ⟳
            </div>
            <h2 className="text-lg font-semibold">Girá el dispositivo</h2>
            <p className="max-w-sm text-sm text-stone-300">
                OpenAO en móvil se juega en horizontal. Rotá la pantalla para
                seguir — la sesión no se corta al rotar.
            </p>
        </div>
    );
}
