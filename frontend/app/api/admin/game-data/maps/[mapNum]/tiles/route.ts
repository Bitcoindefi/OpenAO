import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrlCandidates } from "@/lib/api-base-url";
import { AUTH_COOKIE_NAME } from "@/lib/auth-session";
import { buildAdminGameDataHeaders } from "@/lib/admin-game-data-proxy";

type Context = { params: Promise<{ mapNum: string }> };

export async function PUT(request: Request, context: Context) {
    const { mapNum } = await context.params;
    const parsed = Number.parseInt(mapNum, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return NextResponse.json({ error: "Mapa inválido" }, { status: 400 });
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value?.trim();
    const headers = buildAdminGameDataHeaders(token, process.env.GAME_DATA_ADMIN_PROXY_TOKEN);
    const body = await request.text();
    for (const base of getApiBaseUrlCandidates()) {
        try {
            const response = await fetch(`${base}/admin/game-data/maps/${parsed}/tiles`, { method: "PUT", headers, body, cache: "no-store" });
            return NextResponse.json(await response.json(), { status: response.status });
        } catch { /* try next API candidate */ }
    }
    return NextResponse.json({ error: "API no disponible" }, { status: 503 });
}
