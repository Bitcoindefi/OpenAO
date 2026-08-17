import type { Position } from "./types/runtime";

const PERSIST_WORDS = new Set(["guardar", "guardado", "fijo", "persistente"]);
const MOVEMENT_WORDS = new Set(["mover", "movil", "móvil"]);

function parseMapCoordinate(value: string | undefined): number | null {
    if (!value || !/^\d+$/.test(value)) return null;
    const coordinate = Number.parseInt(value, 10);
    return coordinate >= 1 && coordinate <= 100 ? coordinate : null;
}

export function parseAdminNpcPlacementArgs(input: string): {
    idNpc: number;
    persist: boolean;
    persistMovement: boolean;
    position: Position | null;
} | null {
    const [idInput, ...rawOptions] = input.trim().split(/\s+/).filter(Boolean);
    const idNpc = Number.parseInt(idInput ?? "", 10);
    if (!/^\d+$/.test(idInput ?? "") || idNpc <= 0) return null;

    let persist = false;
    let persistMovement = false;
    const coordinates: string[] = [];
    for (const option of rawOptions) {
        const normalized = option.toLocaleLowerCase("es-AR");
        if (PERSIST_WORDS.has(normalized)) persist = true;
        else if (MOVEMENT_WORDS.has(normalized)) persistMovement = true;
        else coordinates.push(option);
    }
    if (coordinates.length !== 0 && coordinates.length !== 2) return null;
    const x = coordinates.length === 2 ? parseMapCoordinate(coordinates[0]) : null;
    const y = coordinates.length === 2 ? parseMapCoordinate(coordinates[1]) : null;
    if (coordinates.length === 2 && (x == null || y == null)) return null;

    return { idNpc, persist, persistMovement, position: x != null && y != null ? { x, y } : null };
}

export function parseAdminObjectPlacementArgs(input: string): { objIndex: number; position: Position } | null {
    const [objInput, xInput, yInput, ...extra] = input.trim().split(/\s+/).filter(Boolean);
    const objIndex = Number.parseInt(objInput ?? "", 10);
    const x = parseMapCoordinate(xInput);
    const y = parseMapCoordinate(yInput);
    if (extra.length || !/^\d+$/.test(objInput ?? "") || objIndex <= 0 || x == null || y == null) return null;
    return { objIndex, position: { x, y } };
}