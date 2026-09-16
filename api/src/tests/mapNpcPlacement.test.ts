import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, test } from "vitest";
import {
    MAX_NPCS_PER_MAP,
    loadMapNpcPlacements,
    moveMapNpc,
    placeMapNpc,
    removeMapNpc,
} from "../lib/mapNpcStorage";

describe("mapNpcPlacement - colocación y persistencia de NPCs (#8)", () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openao-npc-test-"));
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    test("MAX_NPCS_PER_MAP constante nombrada exportada", () => {
        assert.equal(typeof MAX_NPCS_PER_MAP, "number");
        assert.equal(MAX_NPCS_PER_MAP, 50);
    });

    test("placeMapNpc - coloca un NPC exitosamente y persiste en disco", async () => {
        const result = await placeMapNpc(tempDir, {
            mapNum: 1,
            x: 50,
            y: 50,
            npcIndex: 1,
            movement: 0,
        });

        assert.equal(result.ok, true);
        if (result.ok) {
            assert.equal(result.placements.length, 1);
            assert.deepEqual(result.placements[0], {
                mapNum: 1,
                x: 50,
                y: 50,
                npcIndex: 1,
                movement: 0,
            });
        }

        const fromDisk = await loadMapNpcPlacements(tempDir, 1);
        assert.equal(fromDisk.length, 1);
        assert.equal(fromDisk[0].x, 50);
        assert.equal(fromDisk[0].y, 50);
    });

    test("placeMapNpc - rechaza coordenadas fuera de rango (1-100)", async () => {
        const resZero = await placeMapNpc(tempDir, { mapNum: 1, x: 0, y: 50, npcIndex: 1 });
        assert.equal(resZero.ok, false);

        const resOver = await placeMapNpc(tempDir, { mapNum: 1, x: 101, y: 50, npcIndex: 1 });
        assert.equal(resOver.ok, false);
    });

    test("placeMapNpc - rechaza npcIndex inválido o inexistente", async () => {
        const resInvalid = await placeMapNpc(tempDir, { mapNum: 1, x: 10, y: 10, npcIndex: -5 });
        assert.equal(resInvalid.ok, false);

        const resCatalog = await placeMapNpc(
            tempDir,
            { mapNum: 1, x: 10, y: 10, npcIndex: 9999 },
            { isValidNpcIndex: (idx) => idx <= 340 }
        );
        assert.equal(resCatalog.ok, false);
        if (!resCatalog.ok) {
            assert.match(resCatalog.reason, /no existe en el catálogo/);
        }
    });

    test("placeMapNpc - rechaza colocación sobre tile bloqueado", async () => {
        const blockedTile = (x: number, y: number) => x === 20 && y === 20;
        const res = await placeMapNpc(
            tempDir,
            { mapNum: 1, x: 20, y: 20, npcIndex: 1 },
            { isTileBlocked: blockedTile }
        );

        assert.equal(res.ok, false);
        if (!res.ok) {
            assert.match(res.reason, /tile bloqueado/);
        }
    });

    test("placeMapNpc - rechaza apilar dos NPCs en el mismo tile", async () => {
        await placeMapNpc(tempDir, { mapNum: 2, x: 15, y: 15, npcIndex: 1 });
        const resDup = await placeMapNpc(tempDir, { mapNum: 2, x: 15, y: 15, npcIndex: 2 });

        assert.equal(resDup.ok, false);
        if (!resDup.ok) {
            assert.match(resDup.reason, /Ya existe un NPC/);
        }
    });

    test("placeMapNpc - respeta el límite máximo por mapa", async () => {
        const mapNum = 3;
        for (let i = 1; i <= 3; i++) {
            await placeMapNpc(tempDir, { mapNum, x: i, y: 10, npcIndex: 1 }, { maxNpcs: 3 });
        }

        const resLimit = await placeMapNpc(
            tempDir,
            { mapNum, x: 4, y: 10, npcIndex: 1 },
            { maxNpcs: 3 }
        );
        assert.equal(resLimit.ok, false);
        if (!resLimit.ok) {
            assert.match(resLimit.reason, /límite máximo/);
        }
    });

    test("placeMapNpc - serializa escrituras concurrentes sin perder NPCs", async () => {
        const mapNum = 7;
        const [first, second] = await Promise.all([
            placeMapNpc(tempDir, { mapNum, x: 10, y: 20, npcIndex: 1 }),
            placeMapNpc(tempDir, { mapNum, x: 11, y: 20, npcIndex: 2 }),
        ]);

        assert.equal(first.ok, true);
        assert.equal(second.ok, true);

        const persisted = await loadMapNpcPlacements(tempDir, mapNum);
        assert.equal(persisted.length, 2);
        assert.deepEqual(
            persisted.map(({ x, y, npcIndex }) => ({ x, y, npcIndex })),
            [
                { x: 10, y: 20, npcIndex: 1 },
                { x: 11, y: 20, npcIndex: 2 },
            ],
        );
    });

    test("moveMapNpc - mueve un NPC existente a otra coordenada válida", async () => {
        const mapNum = 4;
        await placeMapNpc(tempDir, { mapNum, x: 10, y: 10, npcIndex: 5 });

        const moveRes = await moveMapNpc(tempDir, mapNum, 10, 10, 12, 14);
        assert.equal(moveRes.ok, true);

        const loaded = await loadMapNpcPlacements(tempDir, mapNum);
        assert.equal(loaded.length, 1);
        assert.equal(loaded[0].x, 12);
        assert.equal(loaded[0].y, 14);
    });

    test("moveMapNpc - mover a la misma casilla actual no falla (caso autodesplazamiento)", async () => {
        const mapNum = 4;
        const selfMoveRes = await moveMapNpc(tempDir, mapNum, 12, 14, 12, 14);
        assert.equal(selfMoveRes.ok, true);

        const loaded = await loadMapNpcPlacements(tempDir, mapNum);
        assert.equal(loaded.length, 1);
        assert.equal(loaded[0].x, 12);
        assert.equal(loaded[0].y, 14);
    });

    test("moveMapNpc - rechaza mover a un tile bloqueado u ocupado", async () => {
        const mapNum = 5;
        await placeMapNpc(tempDir, { mapNum, x: 10, y: 10, npcIndex: 1 });
        await placeMapNpc(tempDir, { mapNum, x: 11, y: 10, npcIndex: 2 });

        const resOccupied = await moveMapNpc(tempDir, mapNum, 10, 10, 11, 10);
        assert.equal(resOccupied.ok, false);

        const resBlocked = await moveMapNpc(
            tempDir,
            mapNum,
            10,
            10,
            30,
            30,
            { isTileBlocked: (x, y) => x === 30 && y === 30 }
        );
        assert.equal(resBlocked.ok, false);
    });

    test("removeMapNpc - quita un NPC y actualiza el archivo", async () => {
        const mapNum = 6;
        await placeMapNpc(tempDir, { mapNum, x: 5, y: 5, npcIndex: 1 });
        await placeMapNpc(tempDir, { mapNum, x: 6, y: 6, npcIndex: 2 });

        const removeRes = await removeMapNpc(tempDir, mapNum, 5, 5);
        assert.equal(removeRes.ok, true);

        const remaining = await loadMapNpcPlacements(tempDir, mapNum);
        assert.equal(remaining.length, 1);
        assert.equal(remaining[0].x, 6);
        assert.equal(remaining[0].y, 6);
    });
});
