import type {
    BodiesDB,
    GraphicsDB,
    HeadsDB,
    MapData,
    NPCsDB,
    ObjectsDB,
} from "@/types/game";
import { UPLOADED_GRAPHIC_INDEX_START } from "@/utils/gameLoader";

export type CatalogKind = "object" | "terrain" | "npc";

export type CatalogEntry = {
    id: string;
    kind: CatalogKind;
    name: string;
    type: number | null;
    graphicId: number | null;
    headGraphicId?: number | null;
    uploaded?: boolean;
};

export function getGraphicPreviewUrl(grhIndex: number, textureFile: string | number): string {
    return grhIndex >= UPLOADED_GRAPHIC_INDEX_START
        ? `/api/game-data/graphics/${grhIndex}.png`
        : `/graphics/${textureFile}.png`;
}

const normalize = (value: string): string =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();

export function buildObjectEntries(objects: ObjectsDB): CatalogEntry[] {
    return Object.entries(objects)
        .map(([id, object]) => ({
            id,
            kind: "object" as const,
            name: object.name || `Objeto ${id}`,
            type: object.objType ?? null,
            graphicId: Number(object.grhIndex) || null,
        }))
        .sort((left, right) => Number(left.id) - Number(right.id));
}

export function buildNpcEntries(
    npcs: NPCsDB,
    bodies: BodiesDB,
    heads: HeadsDB,
): CatalogEntry[] {
    return Object.entries(npcs)
        .map(([id, npc]) => ({
            id,
            kind: "npc" as const,
            name: npc.name || `NPC ${id}`,
            type: npc.npcType ?? null,
            graphicId: bodies[String(npc.idBody)]?.["4"] ?? null,
            headGraphicId: heads[String(npc.idHead)]?.["4"] ?? null,
        }))
        .sort((left, right) => Number(left.id) - Number(right.id));
}

export function buildTerrainEntries(
    mapData: MapData,
    mapNumber: number,
    graphics: GraphicsDB,
): CatalogEntry[] {
    const ids = new Set<number>();
    const map = mapData[String(mapNumber)];
    if (map) {
        for (const row of Object.values(map)) {
            for (const tile of Object.values(row)) {
                for (const graphicId of Object.values(tile.graphics ?? {})) {
                    if (graphicId > 0) ids.add(graphicId);
                }
            }
        }
    }
    for (const id of Object.keys(graphics)) {
        const numericId = Number(id);
        if (numericId >= UPLOADED_GRAPHIC_INDEX_START) ids.add(numericId);
    }
    return [...ids]
        .sort((left, right) => left - right)
        .map((id) => ({
            id: String(id),
            kind: "terrain" as const,
            name: id >= UPLOADED_GRAPHIC_INDEX_START ? `Subido ${id}` : `GRH ${id}`,
            type: null,
            graphicId: id,
            uploaded: id >= UPLOADED_GRAPHIC_INDEX_START,
        }));
}

export function filterCatalogEntries(
    entries: readonly CatalogEntry[],
    query: string,
    type: string,
): CatalogEntry[] {
    const normalizedQuery = normalize(query.trim());
    return entries.filter((entry) => {
        const matchesType = type === "all" || String(entry.type ?? "none") === type;
        const matchesQuery =
            !normalizedQuery ||
            normalize(`${entry.name} ${entry.id}`).includes(normalizedQuery);
        return matchesType && matchesQuery;
    });
}

export function updateRecentIds(
    ids: readonly string[],
    selectedId: string,
    limit = 20,
): string[] {
    return [selectedId, ...ids.filter((id) => id !== selectedId)].slice(0, limit);
}
