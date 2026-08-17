import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export type TileExit = {
    map: number;
    x: number;
    y: number;
};

export type TileExitConfig = TileExit | { destinations: TileExit[] };

export type SpecialsJson = {
    id: number;
    exits: Record<string, TileExitConfig>;
    objects: Record<string, { objIndex: number; amount: number }>;
    npcs: Record<string, number>;
    triggers: Record<string, number>;
};

const MAPS_SOURCE_DIR = path.resolve(__dirname, "../../../server/mapas_source");

function getMapSpecialsPath(mapNum: number): string {
    return path.join(MAPS_SOURCE_DIR, `mapa_${mapNum}`, "specials.json");
}

function readMapSpecials(mapNum: number): SpecialsJson {
    const filePath = getMapSpecialsPath(mapNum);
    if (!fs.existsSync(filePath)) {
        return {
            id: mapNum,
            exits: {},
            objects: {},
            npcs: {},
            triggers: {},
        };
    }

    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw) as SpecialsJson;
    } catch {
        return {
            id: mapNum,
            exits: {},
            objects: {},
            npcs: {},
            triggers: {},
        };
    }
}

function writeMapSpecials(mapNum: number, data: SpecialsJson): void {
    const filePath = getMapSpecialsPath(mapNum);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
}

export const upsertExitSchema = z.object({
    destMap: z.number().int().positive(),
    destX: z.number().int().min(1).max(100),
    destY: z.number().int().min(1).max(100),
    createPaired: z.boolean().optional().default(false),
});

export type UpsertExitInput = z.infer<typeof upsertExitSchema>;

export async function getMapExits(mapNum: number): Promise<{ mapNum: number; exits: Record<string, TileExitConfig> }> {
    const specials = readMapSpecials(mapNum);
    return {
        mapNum,
        exits: specials.exits ?? {},
    };
}

export async function upsertMapExit(
    mapNum: number,
    x: number,
    y: number,
    input: UpsertExitInput,
): Promise<{
    mapNum: number;
    x: number;
    y: number;
    exit: TileExit;
    pairedExitCreated: boolean;
}> {
    const coordKey = `${x},${y}`;
    const exitTarget: TileExit = {
        map: input.destMap,
        x: input.destX,
        y: input.destY,
    };

    const sourceSpecials = readMapSpecials(mapNum);
    if (!sourceSpecials.exits) {
        sourceSpecials.exits = {};
    }
    sourceSpecials.exits[coordKey] = exitTarget;
    writeMapSpecials(mapNum, sourceSpecials);

    let pairedExitCreated = false;

    if (input.createPaired) {
        const destSpecials = readMapSpecials(input.destMap);
        if (!destSpecials.exits) {
            destSpecials.exits = {};
        }
        const destCoordKey = `${input.destX},${input.destY}`;
        destSpecials.exits[destCoordKey] = {
            map: mapNum,
            x,
            y,
        };
        writeMapSpecials(input.destMap, destSpecials);
        pairedExitCreated = true;
    }

    return {
        mapNum,
        x,
        y,
        exit: exitTarget,
        pairedExitCreated,
    };
}

export async function deleteMapExit(
    mapNum: number,
    x: number,
    y: number,
    deletePaired = false,
): Promise<{
    mapNum: number;
    x: number;
    y: number;
    deleted: boolean;
    pairedExitDeleted: boolean;
}> {
    const coordKey = `${x},${y}`;
    const sourceSpecials = readMapSpecials(mapNum);
    const existingExit = sourceSpecials.exits?.[coordKey];

    if (!existingExit) {
        return {
            mapNum,
            x,
            y,
            deleted: false,
            pairedExitDeleted: false,
        };
    }

    delete sourceSpecials.exits[coordKey];
    writeMapSpecials(mapNum, sourceSpecials);

    let pairedExitDeleted = false;

    if (deletePaired && "map" in existingExit) {
        const destMap = existingExit.map;
        const destX = existingExit.x;
        const destY = existingExit.y;
        const destCoordKey = `${destX},${destY}`;

        const destSpecials = readMapSpecials(destMap);
        if (destSpecials.exits?.[destCoordKey]) {
            delete destSpecials.exits[destCoordKey];
            writeMapSpecials(destMap, destSpecials);
            pairedExitDeleted = true;
        }
    }

    return {
        mapNum,
        x,
        y,
        deleted: true,
        pairedExitDeleted,
    };
}
