export function buildAdminGameDataHeaders(
    sessionToken: string | undefined,
    proxyToken: string | undefined = process.env.GAME_DATA_ADMIN_PROXY_TOKEN,
    contentType = "application/json",
): Headers {
    const headers = new Headers({ "Content-Type": contentType });
    if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
    if (proxyToken) headers.set("x-game-data-admin-token", proxyToken);
    return headers;
}