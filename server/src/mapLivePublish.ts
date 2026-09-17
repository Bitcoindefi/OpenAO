/**
 * Live map publish helpers (OpenAO #11).
 *
 * Keeps the hard policy decisions out of gameDataSync so they can be unit-tested:
 * - nearest walkable tile for players trapped on newly blocked tiles
 * - MAP_LIVE_RELOAD console marker that clients watch to invalidate map cache
 */

export const MAP_LIVE_RELOAD_PREFIX = "[MAP_LIVE_RELOAD]";

export type TileCoord = { x: number; y: number };

export type MapTileOverrideLike = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
    status?: "draft" | "published";
};

export function formatMapLiveReloadMessage(mapNum: number, version: number): string {
    return `${MAP_LIVE_RELOAD_PREFIX} map=${mapNum} version=${version}`;
}

export function parseMapLiveReloadMessage(
    message: string,
): { mapNum: number; version: number } | null {
    const match = message.trim().match(/^\[MAP_LIVE_RELOAD\]\s+map=(\d+)\s+version=(\d+)\s*$/);
    if (!match) {
        return null;
    }

    const mapNum = Number.parseInt(match[1] ?? "", 10);
    const version = Number.parseInt(match[2] ?? "", 10);

    if (!Number.isInteger(mapNum) || mapNum <= 0 || !Number.isInteger(version) || version < 0) {
        return null;
    }

    return { mapNum, version };
}

/**
 * BFS for the nearest walkable tile around `from`.
 * `isWalkable(x,y)` must return true only for tiles the player can stand on.
 */
export function findNearestWalkableTile(
    from: TileCoord,
    isWalkable: (x: number, y: number) => boolean,
    mapSize = 100,
    maxRadius = 30,
): TileCoord | null {
    const startX = Math.min(mapSize, Math.max(1, Math.trunc(from.x)));
    const startY = Math.min(mapSize, Math.max(1, Math.trunc(from.y)));

    if (isWalkable(startX, startY)) {
        return { x: startX, y: startY };
    }

    const visited = new Set<string>([`${startX},${startY}`]);
    const queue: Array<TileCoord & { dist: number }> = [{ x: startX, y: startY, dist: 0 }];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.dist >= maxRadius) {
            continue;
        }

        const neighbors: TileCoord[] = [
            { x: current.x - 1, y: current.y },
            { x: current.x + 1, y: current.y },
            { x: current.x, y: current.y - 1 },
            { x: current.x, y: current.y + 1 },
        ];

        for (const neighbor of neighbors) {
            if (neighbor.x < 1 || neighbor.y < 1 || neighbor.x > mapSize || neighbor.y > mapSize) {
                continue;
            }

            const key = `${neighbor.x},${neighbor.y}`;
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);

            if (isWalkable(neighbor.x, neighbor.y)) {
                return neighbor;
            }

            queue.push({ ...neighbor, dist: current.dist + 1 });
        }
    }

    return null;
}

/**
 * Draft overrides must never reach the live game server / public clients.
 * Pure filter used by sync + tests.
 */
export function onlyPublishedOverrides<T extends { status?: string }>(
    overrides: T[],
): T[] {
    return overrides.filter((override) => override.status !== "draft");
}

/**
 * Diff blocked-state changes that clients need via blockMap packets.
 */
export function collectBlockedTileChanges(
    previous: MapTileOverrideLike[],
    next: MapTileOverrideLike[],
): Array<{ x: number; y: number; blocked: boolean }> {
    const prevBlocked = new Map<string, boolean>();
    for (const override of previous) {
        if (override.blocked == null) {
            continue;
        }
        prevBlocked.set(`${override.x},${override.y}`, Boolean(override.blocked));
    }

    const nextBlocked = new Map<string, boolean>();
    for (const override of next) {
        if (override.blocked == null) {
            continue;
        }
        nextBlocked.set(`${override.x},${override.y}`, Boolean(override.blocked));
    }

    const keys = new Set([...prevBlocked.keys(), ...nextBlocked.keys()]);
    const changes: Array<{ x: number; y: number; blocked: boolean }> = [];

    for (const key of keys) {
        const before = prevBlocked.get(key);
        const after = nextBlocked.has(key) ? nextBlocked.get(key)! : false;
        if (before === after) {
            continue;
        }
        const [xRaw, yRaw] = key.split(",");
        changes.push({
            x: Number(xRaw),
            y: Number(yRaw),
            blocked: after,
        });
    }

    return changes;
}
