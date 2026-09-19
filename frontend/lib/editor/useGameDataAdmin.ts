"use client";

import { useEffect, useState } from "react";
import { getMapEditorAccess, type MapEditorAccess } from "./editorApi";

export type GameDataAdminState = "loading" | "allowed" | "denied";

/** Gate de interfaz; cada ruta vuelve a comprobar los permisos en la API. */
export function useMapEditorAccess(enabled = true) {
    const [result, setResult] = useState<{
        state: GameDataAdminState;
        access: MapEditorAccess | null;
    }>({ state: enabled ? "loading" : "denied", access: null });

    useEffect(() => {
        let cancelled = false;
        if (!enabled) {
            setResult({ state: "denied", access: null });
            return;
        }
        setResult({ state: "loading", access: null });
        void getMapEditorAccess().then((access) => {
            if (!cancelled) {
                setResult({ state: access?.canEditMaps ? "allowed" : "denied", access });
            }
        });
        return () => { cancelled = true; };
    }, [enabled]);

    return result;
}

/** Compatibilidad con el enlace al modo construccion. */
export function useGameDataAdmin(enabled = true): GameDataAdminState {
    return useMapEditorAccess(enabled).state;
}
