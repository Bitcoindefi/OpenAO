/**
 * Automated pre-filters for user-map proposals (OpenAO #25).
 *
 * Runs BEFORE a map reaches a human moderator. Covers the issue checklist:
 * prohibited words, spawn-on-blocked, entry reachability (BFS), and isolated
 * walkable regions. Quota counters are validated by the caller.
 */

export const MAP_GRID_SIZE = 100;

export const DEFAULT_PROHIBITED_WORDS = [
    "scam",
    "cheat",
    "hack",
    "bot",
    "exploit",
    "phishing",
    "nazi",
    "hitler",
] as const;

export type TileSample = {
    x: number;
    y: number;
    blocked: boolean;
};

export type MapPrecheckInput = {
    name: string;
    texts?: string[];
    npcNames?: string[];
    tiles: TileSample[];
    spawnPoint?: { x: number; y: number };
    npcCount?: number;
    objectCount?: number;
    maxNpcsPerMap?: number;
    maxObjectsPerMap?: number;
    prohibitedWords?: readonly string[];
};

export type MapPrecheckResult = {
    passed: boolean;
    flags: string[];
};

function inBounds(x: number, y: number): boolean {
    return (
        Number.isInteger(x) &&
        Number.isInteger(y) &&
        x >= 1 &&
        x <= MAP_GRID_SIZE &&
        y >= 1 &&
        y <= MAP_GRID_SIZE
    );
}

function buildBlockedSet(tiles: TileSample[]): {
    blocked: Set<string>;
    known: Set<string>;
} {
    const blocked = new Set<string>();
    const known = new Set<string>();
    for (const tile of tiles) {
        if (!inBounds(tile.x, tile.y)) continue;
        const key = `${tile.x},${tile.y}`;
        known.add(key);
        if (tile.blocked) blocked.add(key);
    }
    return { blocked, known };
}

function keyOf(x: number, y: number): string {
    return `${x},${y}`;
}

/**
 * BFS from spawn across non-blocked known tiles. Unknown tiles are treated as
 * walkable so sparse editor samples still get a useful connectivity signal.
 */
export function findReachableFromSpawn(
    tiles: TileSample[],
    spawnPoint: { x: number; y: number },
): Set<string> {
    // Only traverse known non-blocked samples. Sparse editor payloads must not
    // treat missing tiles as corridors (that would hide isolated regions).
    const { blocked, known } = buildBlockedSet(tiles);
    const start = keyOf(spawnPoint.x, spawnPoint.y);
    const reachable = new Set<string>();
    if (!inBounds(spawnPoint.x, spawnPoint.y) || blocked.has(start)) {
        return reachable;
    }
    if (!known.has(start)) {
        // Spawn itself should be present in the sample set.
        return reachable;
    }

    const queue: Array<{ x: number; y: number }> = [
        { x: spawnPoint.x, y: spawnPoint.y },
    ];
    reachable.add(start);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];
        for (const next of neighbors) {
            if (!inBounds(next.x, next.y)) continue;
            const key = keyOf(next.x, next.y);
            if (!known.has(key) || blocked.has(key) || reachable.has(key)) {
                continue;
            }
            reachable.add(key);
            queue.push(next);
        }
    }
    return reachable;
}

export function countWalkableComponents(tiles: TileSample[]): number {
    const { blocked, known } = buildBlockedSet(tiles);
    const walkable = [...known].filter((key) => !blocked.has(key));
    const remaining = new Set(walkable);
    let components = 0;

    while (remaining.size > 0) {
        const startKey = remaining.values().next().value as string;
        const [sx, sy] = startKey.split(",").map(Number);
        const queue = [{ x: sx, y: sy }];
        remaining.delete(startKey);
        components += 1;
        while (queue.length > 0) {
            const current = queue.shift()!;
            for (const next of [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 },
            ]) {
                const key = keyOf(next.x, next.y);
                if (!remaining.has(key)) continue;
                remaining.delete(key);
                queue.push(next);
            }
        }
    }
    return components;
}

export function runAutomatedMapPreChecks(
    input: MapPrecheckInput,
): MapPrecheckResult {
    const flags: string[] = [];
    const prohibited = input.prohibitedWords ?? DEFAULT_PROHIBITED_WORDS;
    const texts = [
        input.name,
        ...(input.texts ?? []),
        ...(input.npcNames ?? []),
    ];

    for (const text of texts) {
        const lower = String(text ?? "").toLowerCase();
        for (const word of prohibited) {
            if (lower.includes(word)) {
                flags.push(
                    `Texto prohibido detectado ("${word}") en contenido del mapa`,
                );
            }
        }
    }

    if (!input.tiles || input.tiles.length === 0) {
        flags.push("El mapa no incluye muestras de terreno para pre-chequeo");
    }

    const spawn = input.spawnPoint;
    if (!spawn || !inBounds(spawn.x, spawn.y)) {
        flags.push("Falta un punto de entrada valido dentro del mapa 1..100");
    } else {
        const { blocked } = buildBlockedSet(input.tiles ?? []);
        if (blocked.has(keyOf(spawn.x, spawn.y))) {
            flags.push("El punto de entrada esta sobre un tile bloqueado");
        } else {
            const reachable = findReachableFromSpawn(input.tiles ?? [], spawn);
            const { known, blocked: blockedSet } = buildBlockedSet(
                input.tiles ?? [],
            );
            const walkableKnown = [...known].filter((k) => !blockedSet.has(k));
            const unreachable = walkableKnown.filter((k) => !reachable.has(k));
            if (unreachable.length > 0) {
                flags.push(
                    `Hay ${unreachable.length} tiles caminables inalcanzables desde la entrada`,
                );
            }
            if (reachable.size <= 1 && walkableKnown.length > 1) {
                flags.push(
                    "No hay camino util desde el punto de entrada (posible trampa)",
                );
            }
        }
    }

    const components = countWalkableComponents(input.tiles ?? []);
    if (components > 1) {
        flags.push(
            `El mapa tiene ${components} regiones caminables aisladas (posible zona inalcanzable)`,
        );
    }

    if (
        typeof input.maxNpcsPerMap === "number" &&
        typeof input.npcCount === "number" &&
        input.npcCount > input.maxNpcsPerMap
    ) {
        flags.push(
            `Cuota de NPCs excedida (${input.npcCount}/${input.maxNpcsPerMap})`,
        );
    }
    if (
        typeof input.maxObjectsPerMap === "number" &&
        typeof input.objectCount === "number" &&
        input.objectCount > input.maxObjectsPerMap
    ) {
        flags.push(
            `Cuota de objetos excedida (${input.objectCount}/${input.maxObjectsPerMap})`,
        );
    }

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const flag of flags) {
        if (seen.has(flag)) continue;
        seen.add(flag);
        unique.push(flag);
    }

    return { passed: unique.length === 0, flags: unique };
}
