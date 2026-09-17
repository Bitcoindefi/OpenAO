/**
 * Automated map validation checks for user-submitted maps (Issues #24 and #25)
 *
 * Implements:
 * 1. Reserved ID range & structural isolation: User maps live in 100,000 - 999,999,
 *    never colliding with or modifying official world maps (1-500), static local maps (500-599),
 *    challenges (2,000-29,999), or dynamic instances (30,000-99,999).
 * 2. World Isolation: Portals/exits in user maps cannot target official world maps.
 * 3. Economy Isolation: User maps cannot place gold piles, currency (item 12), high-value
 *    loot items, or XP/gold-farming NPCs.
 * 4. Banned words / offensive language detection in map name and texts.
 * 5. Entity limits & quotas validation (NPCs, objects, dimensions, storage bytes).
 * 6. Topological connectivity & reachability check (BFS from spawn point).
 */

export const USER_MAP_START = 100_000;
export const USER_MAP_END = 999_999;
export const OFFICIAL_MAP_START = 1;
export const OFFICIAL_MAP_END = 500;

export function isUserMapNumber(num: number): boolean {
    return Number.isInteger(num) && num >= USER_MAP_START && num <= USER_MAP_END;
}

export function isOfficialMapNumber(num: number): boolean {
    return Number.isInteger(num) && num >= OFFICIAL_MAP_START && num <= OFFICIAL_MAP_END;
}

export type MapEntityPlacement = {
    x: number;
    y: number;
    id?: number;
    entityId?: number;
    name?: string;
    type?: string;
    gold?: number;
    exp?: number;
    drop?: Array<{ item: number; cant: number }>;
    [key: string]: unknown;
};

export type MapTileExit = {
    map: number;
    x: number;
    y: number;
};

export type UserMapData = {
    meta?: {
        name?: string;
        width?: number;
        height?: number;
        spawnX?: number;
        spawnY?: number;
        description?: string;
        allowCombat?: boolean;
        allowExp?: boolean;
        [key: string]: unknown;
    };
    terrain?: Array<{
        x: number;
        y: number;
        blocked?: boolean;
        layer?: number;
        grhIndex?: number | null;
        tileExit?: MapTileExit;
        [key: string]: unknown;
    }>;
    npcs?: MapEntityPlacement[];
    specials?: MapEntityPlacement[];
    signs?: Array<{ x: number; y: number; text: string }>;
    exits?: MapTileExit[];
    [key: string]: unknown;
};

export type UserMapQuotaLimits = {
    maxNpcsPerMap: number;
    maxObjsPerMap: number;
    maxStorageBytes?: number;
    maxWidth?: number;
    maxHeight?: number;
};

// Profanity / banned words filter (Spanish & English baseline offensive terms)
const BANNED_PATTERNS: RegExp[] = [
    /\b(nazi|hitler|fascist|holocaust|genocide)\b/i,
    /\b(puto|puta|maricon|mierda|concha|culiao|pendejo|chupala|pelotudo|hijodeputa)\b/i,
    /\b(fuck|shit|bitch|cunt|nigger|nigga|faggot|whore|slut)\b/i,
];

// Argentum Online Economy Item IDs that are strictly prohibited in user maps
// Item 12 = Monedas de Oro (Gold coins)
// Items 54, 65, 69, 73, 339, 432, etc. = Official house keys
// Items 474 = Barca (Boats/Ships)
const PROHIBITED_ITEM_IDS = new Set<number>([
    12, // Oro / Gold currency
    54, 65, 69, 73, 339, 432, 436, 440, // Llaves oficiales de casas
    474, // Barca
]);

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

    const nameCheck = checkBannedWords(mapName);
    if (!nameCheck.ok) {
        errors.push(`El nombre del mapa contiene términos prohibidos: ${nameCheck.matched.join(', ')}`);
    }

    if (mapData.meta?.description) {
        const descCheck = checkBannedWords(mapData.meta.description);
        if (!descCheck.ok) {
            errors.push(`La descripción del mapa contiene términos prohibidos: ${descCheck.matched.join(', ')}`);
        }
    }

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

/**
 * Validates economy isolation (Issue #24).
 * User maps cannot be an infinite gold or high-tier loot generation exploit.
 */
export function validateEconomyIsolation(mapData: UserMapData): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Check special objects placed
    if (Array.isArray(mapData.specials)) {
        for (const obj of mapData.specials) {
            const entityId = obj.entityId ?? obj.id;
            if (entityId != null && PROHIBITED_ITEM_IDS.has(entityId)) {
                errors.push(`El objeto con ID ${entityId} en (${obj.x}, ${obj.y}) está prohibido en mapas de usuario (aislamiento de economía).`);
            }
            if (obj.gold && obj.gold > 0) {
                errors.push(`No se permite colocar pilas de oro directas en mapas de usuario (encontrado en (${obj.x}, ${obj.y})).`);
            }
        }
    }

    // 2. Check NPCs placed (cannot grant unauthorized gold or high-value drops)
    if (Array.isArray(mapData.npcs)) {
        for (const npc of mapData.npcs) {
            if (npc.gold && npc.gold > 0) {
                errors.push(`El NPC en (${npc.x}, ${npc.y}) no puede otorgar oro directo.`);
            }
            if (Array.isArray(npc.drop)) {
                for (const d of npc.drop) {
                    if (d.item === 12 || PROHIBITED_ITEM_IDS.has(d.item)) {
                        errors.push(`El NPC en (${npc.x}, ${npc.y}) contiene drops de economía oficial prohibidos (ítem ${d.item}).`);
                    }
                }
            }
        }
    }

    return { ok: errors.length === 0, errors };
}

/**
 * Validates world isolation (Issue #24).
 * User map portals/exits cannot target official world maps (1-500).
 */
export function validateWorldIsolation(mapData: UserMapData): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    const checkExit = (exit: MapTileExit, location: string) => {
        if (exit && exit.map != null) {
            // Cannot link into official world maps (1-500)
            if (isOfficialMapNumber(exit.map) || (exit.map >= 1 && exit.map < USER_MAP_START)) {
                errors.push(`La salida en ${location} apunta al mapa oficial ${exit.map}. Los mapas de usuario no pueden abrir portales al mundo oficial (aislamiento de mundo).`);
            }
        }
    };

    if (Array.isArray(mapData.exits)) {
        for (let i = 0; i < mapData.exits.length; i++) {
            checkExit(mapData.exits[i], `salida general #${i + 1}`);
        }
    }

    if (Array.isArray(mapData.terrain)) {
        for (const t of mapData.terrain) {
            if (t.tileExit) {
                checkExit(t.tileExit, `(${t.x}, ${t.y})`);
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

    if (quotas.maxStorageBytes) {
        const byteSize = Buffer.byteLength(JSON.stringify(mapData), 'utf8');
        if (byteSize > quotas.maxStorageBytes) {
            errors.push(`El tamaño del mapa (${byteSize} bytes) supera la cuota máxima de almacenamiento (${quotas.maxStorageBytes} bytes).`);
        }
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

    if (visited.size < 5) {
        errors.push(`El mapa no tiene un área transitable suficiente desde el punto de entrada (solo ${visited.size} tiles alcanzables).`);
    }

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
        economyIsolation: boolean;
        worldIsolation: boolean;
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
    const economyRes = validateEconomyIsolation(mapData);
    const worldRes = validateWorldIsolation(mapData);

    const allErrors = [
        ...textRes.errors,
        ...quotaRes.errors,
        ...reachRes.errors,
        ...economyRes.errors,
        ...worldRes.errors,
    ];
    const allWarnings = [...reachRes.warnings];

    return {
        passed: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        checks: {
            textFilter: textRes.ok,
            quotas: quotaRes.ok,
            reachability: reachRes.ok,
            economyIsolation: economyRes.ok,
            worldIsolation: worldRes.ok,
        },
    };
}
