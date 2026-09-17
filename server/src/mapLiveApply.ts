/**
 * Applies a published map to the live game process and notifies players (OpenAO #11).
 *
 * Differentiates from GM-only /recargarmapa flows by also:
 * - relocating players standing on newly blocked tiles
 * - pushing blockMap deltas
 * - emitting MAP_LIVE_RELOAD so clients invalidate map cache without reconnecting
 */

import {
    findNearestWalkableTile,
    formatMapLiveReloadMessage,
} from "./mapLivePublish";

const vars = require("./vars");
const game = require("./game");
const handleProtocol = require("./handleProtocol");
const { reloadMapDiff, getMapPublishVersion } = require("./gameDataSync");
const { getClientById } = require("./runtimeRegistry");

export type ApplyPublishedMapResult = {
    mapNum: number;
    appliedOverrides: number;
    version: number;
    relocatedPlayers: number;
    notifiedPlayers: number;
    blockedChanges: number;
};

function isPlayerTileWalkable(mapNum: number, x: number, y: number, navegando: boolean): boolean {
    try {
        return Boolean(game.legalPos(x, y, mapNum, Boolean(navegando)));
    } catch {
        return false;
    }
}

function relocateIfTrapped(user: Record<string, any>): boolean {
    const mapNum = Number(user.map ?? 0);
    const pos = user.pos as { x?: number; y?: number } | undefined;
    if (!mapNum || !pos) {
        return false;
    }

    const x = Number(pos.x ?? 0);
    const y = Number(pos.y ?? 0);
    const navegando = Boolean(user.navegando);

    if (isPlayerTileWalkable(mapNum, x, y, navegando)) {
        return false;
    }

    const nearest = findNearestWalkableTile(
        { x, y },
        (nx, ny) => isPlayerTileWalkable(mapNum, nx, ny, navegando),
    );

    if (!nearest) {
        return false;
    }

    const client = getClientById(Number(user.id ?? 0));
    if (!client) {
        return false;
    }

    game.telep(client, mapNum, nearest.x, nearest.y, "map-live-publish-unstuck");
    handleProtocol.console(
        "El mapa se actualizó y tu posición quedó bloqueada. Te movimos al tile caminable más cercano.",
        "#E69500",
        0,
        0,
        client,
    );
    return true;
}

export async function applyPublishedMapToLiveServer(mapNum: number): Promise<ApplyPublishedMapResult> {
    const reload = await reloadMapDiff(mapNum);

    for (const change of reload.blockedChanges) {
        try {
            game.blockMap(mapNum, { x: change.x, y: change.y }, change.blocked ? 1 : 0);
        } catch (error) {
            console.warn(`[MAP LIVE] No se pudo empujar blockMap ${mapNum}@${change.x},${change.y}:`, error);
        }
    }

    let relocatedPlayers = 0;
    let notifiedPlayers = 0;
    const version = reload.version || getMapPublishVersion(mapNum) || Date.now();
    const marker = formatMapLiveReloadMessage(mapNum, version);

    for (const user of Object.values(vars.personajes as Record<string, Record<string, unknown>>)) {
        if (Number(user.map ?? 0) !== mapNum) {
            continue;
        }

        if (relocateIfTrapped(user)) {
            relocatedPlayers += 1;
        }

        const client = getClientById(Number(user.id ?? 0));
        if (!client || client.readyState !== client.OPEN) {
            continue;
        }

        // Machine-readable marker first (client intercepts & invalidates cache).
        handleProtocol.console(marker, "#888888", 0, 0, client);
        handleProtocol.console(
            `[INFO] Mapa ${mapNum} actualizado en vivo (v${version}).`,
            "#E69500",
            0,
            0,
            client,
        );
        notifiedPlayers += 1;
    }

    return {
        mapNum,
        appliedOverrides: reload.appliedOverrides,
        version,
        relocatedPlayers,
        notifiedPlayers,
        blockedChanges: reload.blockedChanges.length,
    };
}
