import type { TilePaint } from "./editorApi";

export const MAX_STROKES = 50;

export type PaintSnapshot = {
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
};

export type PaintOverride = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked?: boolean | null;
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
 *
 * El tope `MAX_STROKES` recorta los trazos mas viejos: el editor no necesita
 * un undo infinito y el lote de un mapa grande ya pesa.
 */
export class PaintHistory {
    #undo: PaintStroke[] = [];
    #redo: PaintStroke[] = [];

    push(tiles: TilePaint[], inverse: TilePaint[]): void {
        if (tiles.length === 0) {
            return;
        }

        this.#undo.push({ tiles, inverse });

        if (this.#undo.length > MAX_STROKES) {
            this.#undo.shift();
        }

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
 * Invierte un lote de pintura contra los overrides actuales.
 *
 * Si el tile ya tenia un override, el inverso restaura ese grafico. Si no,
 * `grhIndex` y `blocked` van en `null` para vaciar la capa.
 */
export function buildInverseTiles(
    forward: TilePaint[],
    overrides: readonly PaintOverride[],
): TilePaint[] {
    const previousByKey = new Map<string, PaintOverride>();

    for (const override of overrides) {
        previousByKey.set(tilePaintKey(override), override);
    }

    return forward.map((tile) => {
        const prior = previousByKey.get(tilePaintKey(tile));

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
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): Array<{ x: number; y: number }> {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const tiles: Array<{ x: number; y: number }> = [];

    for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
            tiles.push({ x, y });
        }
    }

    return tiles;
}
