import type { TilePaint } from "./editorApi";

export type PaintSnapshot = {
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
};

type PaintStroke = {
    tiles: TilePaint[];
    inverse: TilePaint[];
};

function tilePaintKey(tile: Pick<TilePaint, "x" | "y" | "layer">): string {
    return `${tile.x},${tile.y},${tile.layer}`;
}

/**
 * Historial de trazos de terreno: cada push guarda el lote aplicado y su
 * inverso, para deshacer / rehacer sin preguntarle otra vez al servidor.
 */
export class PaintHistory {
    #undo: PaintStroke[] = [];
    #redo: PaintStroke[] = [];

    push(tiles: TilePaint[], inverse: TilePaint[]): void {
        if (tiles.length === 0) {
            return;
        }

        this.#undo.push({ tiles, inverse });
        this.#redo = [];
    }

    undo(): TilePaint[] | null {
        const stroke = this.#undo.pop();

        if (!stroke) {
            return null;
        }

        this.#redo.push(stroke);
        return stroke.inverse;
    }

    redo(): TilePaint[] | null {
        const stroke = this.#redo.pop();

        if (!stroke) {
            return null;
        }

        this.#undo.push(stroke);
        return stroke.tiles;
    }

    clear(): void {
        this.#undo = [];
        this.#redo = [];
    }

    snapshot(): PaintSnapshot {
        return {
            canUndo: this.#undo.length > 0,
            canRedo: this.#redo.length > 0,
            undoCount: this.#undo.length,
            redoCount: this.#redo.length,
        };
    }
}

/**
 * Invierte un lote de pintura contra el estado anterior de cada tile.
 *
 * Si no hay entrada previa, el inverso vacia la capa (`grhIndex` y `blocked`
 * en `null`) para que deshacer no deje el grafico nuevo.
 */
export function buildInverseTiles(
    applied: TilePaint[],
    previous: ReadonlyMap<string, TilePaint>,
): TilePaint[] {
    return applied.map((tile) => {
        const prior = previous.get(tilePaintKey(tile));

        return {
            x: tile.x,
            y: tile.y,
            layer: tile.layer,
            grhIndex: prior?.grhIndex ?? null,
            blocked: prior?.blocked ?? null,
        };
    });
}

/** Tiles de un rectangulo inclusivo, en cualquier direccion de arrastre. */
export function tilesInRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): Array<{ x: number; y: number }> {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const tiles: Array<{ x: number; y: number }> = [];

    for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
            tiles.push({ x, y });
        }
    }

    return tiles;
}
