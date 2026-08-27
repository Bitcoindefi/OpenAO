import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrlCandidates } from "@/lib/api-base-url";
import { AUTH_COOKIE_NAME } from "@/lib/auth-session";

type RouteContext = {
    params: Promise<{ path: string[] }>;
};

/**
 * Proxy hacia los endpoints de administracion del modo construccion.
 *
 * El editor visual (app/construccion) opera contra /admin/game-data/* de la
 * API. En produccion el cliente solo habla con Next, asi que este handler
 * reenvia la peticion con la sesion del usuario y el token de proxy de admin.
 *
 * El token de proxy no sale nunca del servidor: el navegador solo aporta la
 * cookie de sesion, y la API exige ambos para autorizar.
 */
export async function GET(_request: Request, context: RouteContext) {
    return handleEditorProxy("GET", _request, context);
}

export async function PUT(request: Request, context: RouteContext) {
    return handleEditorProxy("PUT", request, context);
}

export async function POST(request: Request, context: RouteContext) {
    return handleEditorProxy("POST", request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
    return handleEditorProxy("DELETE", request, context);
}

async function handleEditorProxy(
    method: string,
    request: Request,
    context: RouteContext,
): Promise<NextResponse> {
    const { path } = await context.params;
    const pathname = path.map(encodeURIComponent).join("/");

    if (!pathname) {
        return NextResponse.json({ error: "Ruta invalida." }, { status: 400 });
    }

    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value?.trim();

    if (!token) {
        return NextResponse.json(
            { error: "Tu sesion no es valida o ya vencio." },
            { status: 401 },
        );
    }

    const adminProxyToken = process.env.GAME_DATA_ADMIN_PROXY_TOKEN?.trim();

    if (!adminProxyToken) {
        return NextResponse.json(
            { error: "El modo construccion no esta habilitado." },
            { status: 403 },
        );
    }

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("x-game-data-admin-token", adminProxyToken);

    const incomingContentType = request.headers.get("content-type");

    if (incomingContentType) {
        headers.set("Content-Type", incomingContentType);
    }

    let body: BodyInit | null = null;

    if (method !== "GET" && method !== "HEAD") {
        body = await request.arrayBuffer();
    }

    for (const apiBaseUrl of getApiBaseUrlCandidates()) {
        try {
            const response = await fetch(
                `${apiBaseUrl}/admin/game-data/${pathname}${new URL(request.url).search}`,
                {
                    method,
                    headers,
                    body,
                    cache: "no-store",
                },
            );

            const payload = await response.json().catch(() => null);

            return NextResponse.json(payload, { status: response.status });
        } catch (error) {
            console.error(
                `No se pudo reenviar /admin/game-data/${pathname} desde ${apiBaseUrl}:`,
                error,
            );
        }
    }

    return NextResponse.json(
        { error: "No se pudo conectar con el servidor." },
        { status: 502 },
    );
}