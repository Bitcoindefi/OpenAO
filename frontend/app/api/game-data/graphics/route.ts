import { NextResponse } from "next/server";
import { getApiBaseUrlCandidates } from "@/lib/api-base-url";

/**
 * Catalogo de graficos subidos desde el modo construccion.
 *
 * El cliente lo suma al catalogo de graficos originales para poder resolver
 * los indices nuevos. Devuelve solo metadatos, no imagenes.
 */
export async function GET() {
    for (const apiBaseUrl of getApiBaseUrlCandidates()) {
        try {
            const response = await fetch(`${apiBaseUrl}/game-data/graphics`, {
                cache: "no-store",
            });

            if (!response.ok) {
                continue;
            }

            return NextResponse.json(await response.json(), {
                headers: { "Cache-Control": "no-store" },
            });
        } catch (error) {
            console.error(
                `No se pudo cargar el catalogo de graficos desde ${apiBaseUrl}:`,
                error,
            );
        }
    }

    // Sin catalogo el juego arranca igual, sin los graficos subidos.
    return NextResponse.json({ graphics: [] });
}
