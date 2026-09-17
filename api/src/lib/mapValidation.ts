/**
 * Automated map validation checks for user-submitted maps (Issue #25)
 *
 * Implements pre-filtering before human moderation:
 * 1. Banned words / offensive language detection in map name and texts
 * 2. Entity limits & quotas validation (NPCs, objects, dimensions)
 * 3. Topological connectivity & reachability check (BFS from spawn point,
 *    detection of trapped walkable pockets and unreachable entities)
 */

export type MapEntityPlacement = {
    x: number;
    y: number;
    id?: number;
    entityId?: number;
    name?: string;
    type?: string;
    [key: string]: unknown;
};

export type UserMapData = {
    meta?: {
        name?: string;
        width?: number;
        height?: number;
        spawnX?: number;
        spawnY?: number;
        description?: string;
        [key: string]: unknown;
    };
    terrain?: Array<{
        x: number;
        y: number;
        blocked?: boolean;
        layer?: number;
        grhIndex?: number | null;
        [key: string]: unknown;
    }>;
    npcs?: MapEntityPlacement[];
    specials?: MapEntityPlacement[];
    signs?: Array<{ x: number; y: number; text: string }>;
    [key: string]: unknown;
};

export type UserMapQuotaLimits = {
    maxNpcsPerMap: number;
    maxObjsPerMap: number;
    maxWidth?: number;
    maxHeight?: number;
};

// Profanity / banned words filter (Spanish & English baseline offensive terms)
const BANNED_PATTERNS: RegExp[] = [
    /\b(nazi|hitler|fascist|holocaust|genocide)\b/i,
    /\b(puto|puta|maricon|mierda|concha|culiao|pendejo|chupala|pelotudo|hijodeputa)\b/i,
    /\b(fuck|shit|bitch|cunt|nigger|nigga|faggot|whore|slut)\b/i,
];

export function checkBannedWords(text: string): { ok: boolean; matched: string[] } {
    if (!text || typeof text !== 'string') return { ok: true, matched: [] };
    const matched: string[] = [];
    for (const pattern of BANNED_PATTERNS) {
        const m = text.match(pattern);
        if (m) {
            matched.push(m[0]);
        }
    }
    return { ok: matched.length === 0, matched };
}

export function validateTextContent(mapName: string, mapData: UserMapData): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Check map name
    const nameCheck = checkBannedWords(mapName);
    if (!nameCheck.ok) {
        errors.push(`El nombre del mapa contiene términos prohibidos: ${nameCheck.matched.join(', ')}`);
    }

    // 2. Check meta description
    if (mapData.meta?.description) {
        const descCheck = checkBannedWords(mapData.meta.description);
        if (!descCheck.ok) {
            errors.push(`La descripción del mapa contiene términos prohibidos: ${descCheck.matched.join(', ')}`);
        }
    }

    // 3. Check NPC names
    if (Array.isArray(mapData.npcs)) {
        for (const npc of mapData.npcs) {
            if (npc.name) {
                const npcCheck = checkBannedWords(npc.name);
                if (!npcCheck.ok) {
                    errors.push(`El NPC en (${npc.x}, ${npc.y}) tiene un nombre no permitido.`);
                }
            }
        }
    }

    // 4. Check sign texts
    if (Array.isArray(mapData.signs)) {
        for (const sign of mapData.signs) {
            if (sign.text) {
                const signCheck = checkBannedWords(sign.text);
                if (!signCheck.ok) {
                    errors.push(`El cartel en (${sign.x}, ${sign.y}) contiene texto prohibido.`);
                }
            }
        }
    }

    return { ok: errors.length === 0, errors };
}

export function validateQuotasAndLimits(
    mapData: UserMapData,
    quotas: UserMapQuotaLimits,
): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const npcCount = Array.isArray(mapData.npcs) ? mapData.npcs.length : 0;
    const objCount = Array.isArray(mapData.specials) ? mapData.specials.length : 0;

    if (npcCount > quotas.maxNpcsPerMap) {
        errors.push(`Supera la cuota máxima de NPCs (${npcCount}/${quotas.maxNpcsPerMap}).`);
    }

    if (objCount > quotas.maxObjsPerMap) {
        errors.push(`Supera la cuota máxima de objetos especiales (${objCount}/${quotas.maxObjsPerMap}).`);
    }

    const width = mapData.meta?.width ?? 100;
    const height = mapData.meta?.height ?? 100;
    const maxWidth = quotas.maxWidth ?? 100;
    const maxHeight = quotas.maxHeight ?? 100;

    if (width < 10 || width > maxWidth || height < 10 || height > maxHeight) {
        errors.push(`Dimensiones de mapa inválidas (${width}x${height}). Permitido: 10x10 a ${maxWidth}x${maxHeight}.`);
    }

    return { ok: errors.length === 0, errors };
}

export function validateReachability(mapData: UserMapData): {
    ok: boolean;
    errors: string[];
    warnings: string[];
    reachableTilesCount: number;
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    const width = mapData.meta?.width ?? 100;
    const height = mapData.meta?.height ?? 100;
    const spawnX = Math.round(mapData.meta?.spawnX ?? Math.floor(width / 2));
    const spawnY = Math.round(mapData.meta?.spawnY ?? Math.floor(height / 2));

    if (spawnX < 1 || spawnX > width || spawnY < 1 || spawnY > height) {
        errors.push(`El punto de aparición (spawn) (${spawnX}, ${spawnY}) está fuera de los límites del mapa.`);
        return { ok: false, errors, warnings, reachableTilesCount: 0 };
    }

    // Map blocked tiles lookup: key = `${x},${y}`
    const blockedTiles = new Set<string>();
    if (Array.isArray(mapData.terrain)) {
        for (const t of mapData.terrain) {
            if (t.blocked && t.x >= 1 && t.x <= width && t.y >= 1 && t.y <= height) {
                blockedTiles.add(`${t.x},${t.y}`);
            }
        }
    }

    const spawnKey = `${spawnX},${spawnY}`;
    if (blockedTiles.has(spawnKey)) {
        errors.push(`El punto de entrada o aparición (${spawnX}, ${spawnY}) está bloqueado.`);
        return { ok: false, errors, warnings, reachableTilesCount: 0 };
    }

    // BFS exploration from spawn point
    const visited = new Set<string>();
    const queue: Array<[number, number]> = [[spawnX, spawnY]];
    visited.add(spawnKey);

    const neighbors = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
    ];

    while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of neighbors) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 1 && nx <= width && ny >= 1 && ny <= height) {
                const key = `${nx},${ny}`;
                if (!visited.has(key) && !blockedTiles.has(key)) {
                    visited.add(key);
                    queue.push([nx, ny]);
                }
            }
        }
    }

    // Must have at least a minimal walkable area
    if (visited.size < 5) {
        errors.push(`El mapa no tiene un área transitable suficiente desde el punto de entrada (solo ${visited.size} tiles alcanzables).`);
    }

    // Check if NPCs or specials are placed on blocked or unreachable tiles
    if (Array.isArray(mapData.npcs)) {
        for (const npc of mapData.npcs) {
            const key = `${npc.x},${npc.y}`;
            if (blockedTiles.has(key)) {
                warnings.push(`El NPC en (${npc.x}, ${npc.y}) está ubicado sobre un tile bloqueado.`);
            } else if (!visited.has(key)) {
                warnings.push(`El NPC en (${npc.x}, ${npc.y}) no es alcanzable desde el punto de aparición.`);
            }
        }
    }

    if (Array.isArray(mapData.specials)) {
        for (const obj of mapData.specials) {
            const key = `${obj.x},${obj.y}`;
            if (!visited.has(key) && !blockedTiles.has(key)) {
                warnings.push(`El objeto en (${obj.x}, ${obj.y}) se encuentra en una región inaccesible.`);
            }
        }
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        reachableTilesCount: visited.size,
    };
}

export type AutomatedCheckResult = {
    passed: boolean;
    errors: string[];
    warnings: string[];
    checks: {
        textFilter: boolean;
        quotas: boolean;
        reachability: boolean;
    };
};

export function runAutomatedMapChecks(
    mapName: string,
    mapData: UserMapData,
    quotas: UserMapQuotaLimits,
): AutomatedCheckResult {
    const textRes = validateTextContent(mapName, mapData);
    const quotaRes = validateQuotasAndLimits(mapData, quotas);
    const reachRes = validateReachability(mapData);

    const allErrors = [...textRes.errors, ...quotaRes.errors, ...reachRes.errors];
    const allWarnings = [...reachRes.warnings];

    return {
        passed: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        checks: {
            textFilter: textRes.ok,
            quotas: quotaRes.ok,
            reachability: reachRes.ok,
        },
    };
}
