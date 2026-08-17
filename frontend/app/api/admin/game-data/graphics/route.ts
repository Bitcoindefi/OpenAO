import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrlCandidates } from "@/lib/api-base-url";
import { AUTH_COOKIE_NAME } from "@/lib/auth-session";
import { buildAdminGameDataHeaders } from "@/lib/admin-game-data-proxy";

async function adminHeaders(contentType = "application/json") {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value?.trim();
    return buildAdminGameDataHeaders(token, process.env.GAME_DATA_ADMIN_PROXY_TOKEN, contentType);
}

export async function POST(request: Request) {
    const body = await request.arrayBuffer();
    for (const base of getApiBaseUrlCandidates()) {
        try {
            const response = await fetch(`${base}/admin/game-data/graphics`, {
                method: "POST",
                headers: await adminHeaders("image/png"),
                body,
                cache: "no-store",
            });
            const payload = await response.json();
            return NextResponse.json(payload, { status: response.status });
        } catch { /* try next API candidate */ }
    }
    return NextResponse.json({ error: "API no disponible" }, { status: 503 });
}
