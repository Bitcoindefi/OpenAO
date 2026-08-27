"use client";

import { useEffect, useState } from "react";
import { isGameDataAdmin } from "./editorApi";

export type GameDataAdminState = "loading" | "allowed" | "denied";

/**
 * Si la cuenta puede editar mapas.
 *
 * El permiso lo decide la API: el token del proxy vive solo en el servidor, asi
 * que el navegador no tiene forma de saberlo por su cuenta y hay que preguntar.
 * Es un gate de interfaz para no mostrar un editor que va a responder 403, no
 * una barrera de seguridad: cada endpoint del editor valida por su cuenta.
 *
 * @param enabled Cuando es `false` no se pregunta nada y el estado es `denied`.
 *   Sirve para no gastar una peticion si ya se sabe que no hay sesion.
 */
export function useGameDataAdmin(enabled = true): GameDataAdminState {
    const [state, setState] = useState<GameDataAdminState>(
        enabled ? "loading" : "denied",
    );

    useEffect(() => {
        if (!enabled) {
            setState("denied");
            return;
        }

        let cancelled = false;
        setState("loading");

        void isGameDataAdmin().then((allowed) => {
            if (!cancelled) {
                setState(allowed ? "allowed" : "denied");
            }
        });

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return state;
}
