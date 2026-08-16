import { getApiBaseUrlCandidates } from "@/lib/api-base-url";

type RouteContext = {
    params: Promise<{ file: string }>;
};

/**
 * Sirve un PNG subido desde el modo construccion.
 *
 * El contenido de un indice nunca cambia (subir otra imagen genera otro
 * indice), asi que se cachea de forma agresiva. Ese encabezado es tambien lo
 * que permite poner un CDN adelante sin ningun cambio de codigo.
 */
export async function GET(_request: Request, context: RouteContext) {
    const { file } = await context.params;
    const match = /^(\d+)\.png$/.exec(file);

    if (!match) {
        return new Response(JSON.stringify({ error: "Nombre invalido." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const grhIndex = match[1];

    for (const apiBaseUrl of getApiBaseUrlCandidates()) {
        try {
            const response = await fetch(
                `${apiBaseUrl}/game-data/graphics/${grhIndex}.png`,
            );

            if (!response.ok) {
                continue;
            }

            return new Response(await response.arrayBuffer(), {
                headers: {
                    "Content-Type": "image/png",
                    "X-Content-Type-Options": "nosniff",
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            });
        } catch (error) {
            console.error(
                `No se pudo servir el grafico ${grhIndex} desde ${apiBaseUrl}:`,
                error,
            );
        }
    }

    return new Response(JSON.stringify({ error: "Grafico no encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
    });
}
