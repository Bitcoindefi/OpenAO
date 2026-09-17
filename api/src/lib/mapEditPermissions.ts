/**
 * Etapa 0 (#4): decision pura de permisos de edicion de mapas.
 * Sin I/O — testeable sin Postgres.
 */

/** Ciudades principales (issue #4). Colaboradores nunca; admin solo con override. */
export const PROTECTED_MAPS: ReadonlySet<number> = new Set([1, 34, 59, 150]);

export function isProtectedMap(mapNum: number): boolean {
    return PROTECTED_MAPS.has(mapNum);
}

export type MapEditDecision =
    | { allowed: true }
    | { allowed: false; reason: string; code: "forbidden" | "protected" };

/**
 * Reglas:
 * - Mapa protegido: solo superadmin + overrideProtected.
 * - Superadmin: puede editar cualquier mapa no protegido.
 * - Colaborador: solo mapas en grantedMapNums (o map_num=0 = todos no protegidos).
 */
export function evaluateMapEditPermission(input: {
    accountId: string;
    mapNum: number;
    isSuperAdmin: boolean;
    overrideProtected: boolean;
    grantedMapNums: number[];
}): MapEditDecision {
    const { accountId, mapNum, isSuperAdmin, overrideProtected, grantedMapNums } =
        input;

    if (!Number.isInteger(mapNum) || mapNum <= 0) {
        return {
            allowed: false,
            reason: `Numero de mapa invalido: ${mapNum}.`,
            code: "forbidden",
        };
    }

    if (isProtectedMap(mapNum)) {
        if (isSuperAdmin && overrideProtected) {
            return { allowed: true };
        }
        return {
            allowed: false,
            reason: isSuperAdmin
                ? `El mapa ${mapNum} esta protegido. Envia header x-protected-map-override: true para forzar la edicion.`
                : `El mapa ${mapNum} esta protegido. Los colaboradores no pueden editarlo.`,
            code: "protected",
        };
    }

    if (isSuperAdmin) {
        return { allowed: true };
    }

    const granted = new Set(grantedMapNums);
    if (granted.has(mapNum) || granted.has(0)) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: `La cuenta ${accountId} no tiene permisos para editar el mapa ${mapNum}.`,
        code: "forbidden",
    };
}

export function parseProtectedOverride(
    headerValue: string | undefined,
): boolean {
    return (headerValue ?? "").trim().toLowerCase() === "true";
}
