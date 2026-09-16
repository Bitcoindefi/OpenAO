import type { MapNpcPlacement } from "./mapNpcStorage";

export type MapTileOverride = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
};

export type MapTileEntity = {
    x: number;
    y: number;
    kind: "obj" | "npc";
    entityId: number;
};

type MapOverridesResponse = {
    mapNum?: number;
    overrides?: unknown;
    entities?: unknown;
};

type RuntimeVars = Record<string, any>;

function isCoordinate(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeTileOverride(value: unknown): MapTileOverride | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    const x = Number(candidate.x);
    const y = Number(candidate.y);
    const layer = Number(candidate.layer);
    const grhIndex = candidate.grhIndex == null ? null : Number(candidate.grhIndex);

    if (
        !isCoordinate(x) ||
        !isCoordinate(y) ||
        ![1, 2, 3, 4].includes(layer) ||
        (grhIndex !== null && (!Number.isInteger(grhIndex) || grhIndex <= 0))
    ) {
        return null;
    }

    return { x, y, layer, grhIndex, blocked: candidate.blocked == null ? null : Boolean(candidate.blocked) };
}

function normalizeTileEntity(value: unknown): MapTileEntity | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    const x = Number(candidate.x);
    const y = Number(candidate.y);
    const entityId = Number(candidate.entityId);
    const kind = String(candidate.kind);

    if (
        !isCoordinate(x) ||
        !isCoordinate(y) ||
        !Number.isInteger(entityId) ||
        entityId <= 0 ||
        kind !== "obj" && kind !== "npc"
    ) {
        return null;
    }

    return { x, y, kind: kind as "obj" | "npc", entityId };
}

export function normalizeMapOverrides(value: unknown): MapTileOverride[] {
    return Array.isArray(value)
        ? value.map(normalizeTileOverride).filter((entry): entry is MapTileOverride => entry !== null)
        : [];
}

export function normalizeMapEntities(value: unknown): MapTileEntity[] {
    return Array.isArray(value)
        ? value.map(normalizeTileEntity).filter((entry): entry is MapTileEntity => entry !== null)
        : [];
}

export function applyTileOverride(
    vars: RuntimeVars,
    mapNum: number,
    override: MapTileOverride,
): boolean {
    const tile = vars.mapa?.[mapNum]?.[override.y]?.[override.x];

    if (!tile) {
        return false;
    }

    const graphics = { ...(tile.graphics ?? {}) };

    if (override.grhIndex === null) {
        delete graphics[String(override.layer)];
    } else {
        graphics[String(override.layer)] = override.grhIndex;
    }

    if (Object.keys(graphics).length > 0) {
        tile.graphics = graphics;
    } else {
        delete tile.graphics;
    }

    if (override.blocked === null) {
        return true;
    }

    if (override.blocked) {
        tile.blocked = 1;
        tile.blockedOverride = 1;
    } else {
        delete tile.blocked;
        tile.blockedOverride = 0;
    }

    return true;
}

export function applyTileEntity(
    vars: RuntimeVars,
    mapNum: number,
    entity: MapTileEntity,
): boolean {
    const tile = vars.mapa?.[mapNum]?.[entity.y]?.[entity.x];

    if (!tile) {
        return false;
    }

    if (entity.kind === "obj") {
        tile.objInfo = {
            objIndex: entity.entityId,
            amount: Number(tile.objInfo?.amount ?? 1) || 1,
        };
    } else {
        tile.npcIndex = entity.entityId;
    }

    return true;
}

export function applyPublishedMapOverrides(
    vars: RuntimeVars,
    response: MapOverridesResponse,
    fallbackMapNum: number,
): { tileOverrides: number; entities: number; npcPlacements: MapNpcPlacement[] } {
    const mapNum = Number(response.mapNum ?? fallbackMapNum);
    const tileOverrides = normalizeMapOverrides(response.overrides);
    const entities = normalizeMapEntities(response.entities);
    const npcPlacements: MapNpcPlacement[] = [];

    for (const override of tileOverrides) {
        applyTileOverride(vars, mapNum, override);
    }

    for (const entity of entities) {
        applyTileEntity(vars, mapNum, entity);

        if (entity.kind === "npc") {
            npcPlacements.push({ mapNum, x: entity.x, y: entity.y, npcIndex: entity.entityId });
        }
    }

    return { tileOverrides: tileOverrides.length, entities: entities.length, npcPlacements };
}

export async function initializeMapOverridesFromApi(
    vars: RuntimeVars,
    mapNumbers: number[],
    fetchUrl: (path: string) => Promise<unknown>,
): Promise<{
    mapNumbers: number;
    tileOverrides: number;
    entities: number;
    npcPlacements: MapNpcPlacement[];
}> {
    const npcPlacements: MapNpcPlacement[] = [];
    let tileOverrides = 0;
    let entities = 0;
    const concurrency = 12;

    for (let index = 0; index < mapNumbers.length; index += concurrency) {
        const chunk = mapNumbers.slice(index, index + concurrency);
        const responses = await Promise.all(
            chunk.map(async (mapNum) => (await fetchUrl(`/maps/${mapNum}/overrides`)) as any),
        );

        for (let responseIndex = 0; responseIndex < responses.length; responseIndex += 1) {
            const result = applyPublishedMapOverrides(vars, responses[responseIndex], chunk[responseIndex]);
            tileOverrides += result.tileOverrides;
            entities += result.entities;
            npcPlacements.push(...result.npcPlacements);
        }
    }

    vars.publishedMapNpcPlacements = npcPlacements;

    return { mapNumbers: mapNumbers.length, tileOverrides, entities, npcPlacements };
}

export function mergeNpcPlacements(
    basePlacements: MapNpcPlacement[],
    overridePlacements: MapNpcPlacement[] | undefined,
): MapNpcPlacement[] {
    const byKey = new Map<string, MapNpcPlacement>();

    for (const placement of basePlacements) {
        byKey.set(`${placement.mapNum}:${placement.x}:${placement.y}`, placement);
    }

    for (const placement of overridePlacements ?? []) {
        byKey.set(`${placement.mapNum}:${placement.x}:${placement.y}`, placement);
    }

    return [...byKey.values()].sort(
        (left, right) =>
            left.mapNum - right.mapNum ||
            left.y - right.y ||
            left.x - right.x ||
            left.npcIndex - right.npcIndex,
    );
}
