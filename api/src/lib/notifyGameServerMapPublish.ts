import config from "../config";

export type GameServerHotReloadResult = {
    notified: boolean;
    skipped: boolean;
    error?: string;
    result?: unknown;
};

/**
 * Pide al game server que aplique el mapa publicado sin reiniciar el proceso.
 * Si GAME_SERVER_INTERNAL_URL no esta configurada, se omite (publish en DB igual vale).
 */
export async function notifyGameServerMapPublish(
    mapNum: number,
): Promise<GameServerHotReloadResult> {
    const baseUrl = config.gameServerInternalUrl?.trim();
    if (!baseUrl) {
        return { notified: false, skipped: true };
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/internal/maps/${mapNum}/hot-reload`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: config.tokenAuth,
            },
            body: JSON.stringify({ mapNum }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                notified: false,
                skipped: false,
                error: typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`,
            };
        }

        return { notified: true, skipped: false, result: payload };
    } catch (error) {
        return {
            notified: false,
            skipped: false,
            error: error instanceof Error ? error.message : "notify failed",
        };
    }
}
