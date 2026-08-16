import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrlCandidates } from "@/lib/api-base-url";
import { AUTH_COOKIE_NAME } from "@/lib/auth-session";

type RouteContext = {
    params: Promise<{ mapNum: string }>;
};

/**
 * Tiles editados desde el modo construccion para un mapa.
 *
 * En produccion todo /api/* entra por Next, no por el Express directamente,
 * asi que este handler es el que expone el endpoint al cliente. Es publico:
 * cualquier jugador que entre a un mapa editado necesita estos datos.
 *
 * Se reenvia la sesion si existe: la API decide con eso si ademas de lo
 * publicado devuelve los borradores. Un admin ve su trabajo en curso; un
 * jugador comun, solo lo publicado.
 */
export async function GET(_request: Request, context: RouteContext) {
    const { mapNum } = await context.params;
    const parsed = Number.parseInt(mapNum, 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
            { error: "Numero de mapa invalido." },
            { status: 400 },
        );
    }

    const headers = new Headers();

    try {
        const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value?.trim();
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
    } catch {
        // Sin cookie se piden solo los tiles publicados.
    }

    for (const apiBaseUrl of getApiBaseUrlCandidates()) {
        try {
            const response = await fetch(
                `${apiBaseUrl}/maps/${parsed}/overrides`,
                { cache: "no-store", headers },
            );

            if (!response.ok) {
                continue;
            }

            return NextResponse.json(await response.json(), {
                headers: { "Cache-Control": "no-store" },
            });
        } catch (error) {
            console.error(
                `No se pudieron cargar los overrides del mapa ${parsed} desde ${apiBaseUrl}:`,
                error,
            );
        }
    }

    // Si la API no responde, el mapa se dibuja sin ediciones en vez de fallar.
    return NextResponse.json({ mapNum: parsed, overrides: [] });
}
