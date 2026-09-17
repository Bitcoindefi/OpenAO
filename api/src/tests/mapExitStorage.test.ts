import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
    MAP_GRID_SIZE,
    atomicWriteJsonFile,
    checkExitConnectivityBFS,
    loadMapExits,
    normalizeExitEntry,
    normalizeExitTarget,
    parseExitKey,
    placeMapExit,
    removeMapExit,
    saveMapExits,
    toExitKey,
    validateExitEntryBFS,
    withAtomicRollback,
} from "../lib/mapExitStorage";

describe("mapExitStorage - Validación BFS y Rollback Atómico (#10)", () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openao-exit-test-"));
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe("Normalización y Helpers de Claves", () => {
        test("toExitKey y parseExitKey", () => {
            assert.equal(toExitKey(15, 25), "15,25");
            assert.deepEqual(parseExitKey("15,25"), { x: 15, y: 25 });
            assert.equal(parseExitKey("invalid"), null);
            assert.equal(parseExitKey("0,50"), null);
            assert.equal(parseExitKey("50,101"), null);
        });

        test("normalizeExitTarget valida coordenadas y mapa", () => {
            assert.deepEqual(normalizeExitTarget({ map: 1, x: 50, y: 50 }), {
                map: 1,
                x: 50,
                y: 50,
            });
            assert.equal(normalizeExitTarget({ map: 0, x: 50, y: 50 }), null);
            assert.equal(normalizeExitTarget({ map: 1, x: 0, y: 50 }), null);
            assert.equal(normalizeExitTarget({ map: 1, x: 101, y: 50 }), null);
            assert.equal(normalizeExitTarget({ map: 1, x: 50, y: -1 }), null);
            assert.equal(normalizeExitTarget("not an object"), null);
        });

        test("normalizeExitEntry admite destinos simples y múltiples", () => {
            // Simple
            const single = normalizeExitEntry({ map: 2, x: 10, y: 20 });
            assert.deepEqual(single, { map: 2, x: 10, y: 20 });

            // Múltiple
            const multi = normalizeExitEntry({
                destinations: [
                    { map: 2, x: 10, y: 20 },
                    { map: 3, x: 15, y: 25 },
                ],
            });
            assert.deepEqual(multi, {
                destinations: [
                    { map: 2, x: 10, y: 20 },
                    { map: 3, x: 15, y: 25 },
                ],
            });

            // Múltiple vacío
            assert.equal(normalizeExitEntry({ destinations: [] }), null);
        });
    });

    describe("Validación BFS de Conectividad en la Grilla", () => {
        test("BFS aprueba destino en espacio abierto", () => {
            // Sin tiles bloqueados
            const result = checkExitConnectivityBFS(
                { map: 1, x: 50, y: 50 },
                { isTileBlocked: () => false },
            );

            assert.equal(result.ok, true);
            assert.equal(result.accessibleNeighbors, 4);
            assert.ok((result.reachableCount ?? 0) >= 2);
        });

        test("BFS rechaza si el tile de destino mismo está bloqueado", () => {
            const isBlocked = (_map: number, x: number, y: number) =>
                x === 50 && y === 50;

            const result = checkExitConnectivityBFS(
                { map: 1, x: 50, y: 50 },
                { isTileBlocked: isBlocked },
            );

            assert.equal(result.ok, false);
            assert.match(result.reason || "", /está bloqueado/);
        });

        test("BFS rechaza si el destino está totalmente rodeado de bloqueos (0 vecinos accesibles)", () => {
            // (50, 50) libre, pero sus 4 vecinos inmediatos bloqueados
            const blockedCoords = new Set(["50,49", "50,51", "49,50", "51,50"]);
            const isBlocked = (_map: number, x: number, y: number) =>
                blockedCoords.has(`${x},${y}`);

            const result = checkExitConnectivityBFS(
                { map: 1, x: 50, y: 50 },
                { isTileBlocked: isBlocked, minAccessibleNeighbors: 1 },
            );

            assert.equal(result.ok, false);
            assert.equal(result.accessibleNeighbors, 0);
            assert.match(result.reason || "", /no posee coordenadas vecinas transitables/);
        });

        test("BFS rechaza si el componente conexo no alcanza el mínimo requerido", () => {
            // Caja 2x1 transitable: (50,50) y (51,50). Todos los demás alrededor bloqueados.
            // minConnectedTiles = 5 -> debe fallar.
            const walkable = new Set(["50,50", "51,50"]);
            const isBlocked = (_map: number, x: number, y: number) =>
                !walkable.has(`${x},${y}`);

            const result = checkExitConnectivityBFS(
                { map: 1, x: 50, y: 50 },
                { isTileBlocked: isBlocked, minConnectedTiles: 5 },
            );

            assert.equal(result.ok, false);
            assert.equal(result.reachableCount, 2);
            assert.match(result.reason || "", /insuficiente/);
        });

        test("BFS verifica alcanzabilidad hacia un targetCoords específico", () => {
            // Pared divisoria en x = 40 (de y=1 a 100) bloqueando el paso a (30, 50)
            const isBlocked = (_map: number, x: number, _y: number) => x === 40;

            const unreachableResult = checkExitConnectivityBFS(
                { map: 1, x: 50, y: 50 },
                {
                    isTileBlocked: isBlocked,
                    targetCoords: { x: 30, y: 50 },
                },
            );
            assert.equal(unreachableResult.ok, false);
            assert.match(unreachableResult.reason || "", /No hay camino transitable/);

            // Camino abierto
            const reachableResult = checkExitConnectivityBFS(
                { map: 1, x: 50, y: 50 },
                {
                    isTileBlocked: () => false,
                    targetCoords: { x: 48, y: 50 },
                },
            );
            assert.equal(reachableResult.ok, true);
        });

        test("validateExitEntryBFS falla si cualquiera de los destinos múltiples es inalcanzable", () => {
            const blockedTiles = new Set(["60,60"]);
            const isBlocked = (_map: number, x: number, y: number) =>
                blockedTiles.has(`${x},${y}`);

            const entry = {
                destinations: [
                    { map: 1, x: 10, y: 10 },
                    { map: 1, x: 60, y: 60 }, // Bloqueado
                ],
            };

            const res = validateExitEntryBFS(entry, { isTileBlocked: isBlocked });
            assert.equal(res.ok, false);
            assert.match(res.reason || "", /bloqueado/);
        });
    });

    describe("Mecanismo de Rollback Atómico en Guardado de Mapas", () => {
        test("atomicWriteJsonFile escribe y persiste correctamente", async () => {
            const testFile = path.join(tempDir, "atomic-test.json");
            await atomicWriteJsonFile(testFile, { test: "data", val: 123 });

            const readBack = JSON.parse(await fs.readFile(testFile, "utf8"));
            assert.deepEqual(readBack, { test: "data", val: 123 });
        });

        test("atomicWriteJsonFile restaura archivo previo si ocurre un error", async () => {
            const testFile = path.join(tempDir, "rollback-test.json");
            const originalData = { status: "initial_safe_state", version: 1 };
            await fs.writeFile(testFile, JSON.stringify(originalData, null, 2), "utf8");

            // Simular objeto circular que no serializa
            const circularData: any = { version: 2 };
            circularData.self = circularData;

            await assert.rejects(
                () => atomicWriteJsonFile(testFile, circularData),
                /Fallo en guardado atómico de mapa/,
            );

            // El archivo original DEBE estar intacto
            const currentContent = JSON.parse(await fs.readFile(testFile, "utf8"));
            assert.deepEqual(currentContent, originalData);
        });

        test("withAtomicRollback ejecuta rollback si la operación falla", async () => {
            const testFile = path.join(tempDir, "transactional-rollback.json");
            const originalData = { exits: { "10,10": { map: 2, x: 5, y: 5 } } };
            await fs.writeFile(testFile, JSON.stringify(originalData, null, 2), "utf8");

            await assert.rejects(async () => {
                await withAtomicRollback(testFile, async (current) => {
                    // Modificación provisional que falla a mitad de camino
                    const modified = { ...current, corrupt: true };
                    throw new Error("Simulated business validation error inside transaction");
                });
            }, /Simulated business validation error/);

            // El archivo original DEBE mantenerse sin cambios
            const currentContent = JSON.parse(await fs.readFile(testFile, "utf8"));
            assert.deepEqual(currentContent, originalData);
        });
    });

    describe("Operaciones de Storage de Salidas (placeMapExit & removeMapExit)", () => {
        const mapNum = 99;

        beforeEach(async () => {
            const mapDir = path.join(tempDir, `mapa_${mapNum}`);
            await fs.mkdir(mapDir, { recursive: true });
            const initialSpecials = {
                id: mapNum,
                objects: { "20,20": { objIndex: 5, amount: 1 } },
                npcs: { "30,30": 12 },
                triggers: { "40,40": 1 },
                exits: {},
            };
            await fs.writeFile(
                path.join(mapDir, "specials.json"),
                JSON.stringify(initialSpecials, null, 2),
                "utf8",
            );
        });

        test("placeMapExit valida y almacena salida preservando objetos, npcs y triggers", async () => {
            const res = await placeMapExit(
                tempDir,
                {
                    mapNum,
                    x: 10,
                    y: 10,
                    exit: { map: 1, x: 50, y: 50 },
                },
                { isTileBlocked: () => false },
            );

            assert.equal(res.ok, true);
            if (res.ok) {
                assert.ok(res.exits["10,10"]);
                assert.deepEqual(res.exits["10,10"], { map: 1, x: 50, y: 50 });
            }

            // Verificar en disco
            const specialsOnDisk = JSON.parse(
                await fs.readFile(
                    path.join(tempDir, `mapa_${mapNum}`, "specials.json"),
                    "utf8",
                ),
            );

            assert.equal(specialsOnDisk.id, mapNum);
            assert.ok(specialsOnDisk.objects["20,20"]);
            assert.ok(specialsOnDisk.npcs["30,30"]);
            assert.ok(specialsOnDisk.triggers["40,40"]);
            assert.deepEqual(specialsOnDisk.exits["10,10"], { map: 1, x: 50, y: 50 });
        });

        test("placeMapExit rechaza colocación sobre tile de origen bloqueado", async () => {
            const isBlocked = (m: number, x: number, y: number) =>
                m === mapNum && x === 10 && y === 10;

            const res = await placeMapExit(
                tempDir,
                {
                    mapNum,
                    x: 10,
                    y: 10,
                    exit: { map: 1, x: 50, y: 50 },
                },
                { isTileBlocked: isBlocked },
            );

            assert.equal(res.ok, false);
            assert.match(res.reason || "", /tile bloqueado/);

            // Verificar que no se escribió nada
            const exits = await loadMapExits(tempDir, mapNum);
            assert.equal(Object.keys(exits).length, 0);
        });

        test("placeMapExit rechaza salida con destino inalcanzable (BFS) sin alterar el disco", async () => {
            const blockedTiles = new Set(["1,50,50"]); // Destino bloqueado
            const isBlocked = (m: number, x: number, y: number) =>
                blockedTiles.has(`${m},${x},${y}`);

            const res = await placeMapExit(
                tempDir,
                {
                    mapNum,
                    x: 10,
                    y: 10,
                    exit: { map: 1, x: 50, y: 50 },
                },
                { isTileBlocked: isBlocked },
            );

            assert.equal(res.ok, false);
            assert.match(res.reason || "", /está bloqueado/);

            const exits = await loadMapExits(tempDir, mapNum);
            assert.equal(Object.keys(exits).length, 0);
        });

        test("removeMapExit remueve la salida existente y persiste", async () => {
            // Colocar primero
            await placeMapExit(
                tempDir,
                {
                    mapNum,
                    x: 12,
                    y: 12,
                    exit: { map: 1, x: 50, y: 50 },
                },
                { isTileBlocked: () => false },
            );

            // Remover
            const res = await removeMapExit(tempDir, mapNum, 12, 12);
            assert.equal(res.ok, true);
            if (res.ok) {
                assert.equal(res.exits["12,12"], undefined);
            }

            const fromDisk = await loadMapExits(tempDir, mapNum);
            assert.equal(fromDisk["12,12"], undefined);
        });

        test("removeMapExit retorna error si la salida no existe", async () => {
            const res = await removeMapExit(tempDir, mapNum, 90, 90);
            assert.equal(res.ok, false);
            assert.match(res.reason || "", /No existe ninguna salida/);
        });

        test("validateExitEntryBFS rechaza salida sin destinos configurados", () => {
            const emptyEntry = { destinations: [] } as any;
            const res = validateExitEntryBFS(emptyEntry);
            assert.equal(res.ok, false);
            assert.match(res.reason || "", /no contiene destinos válidos/);
        });

        test("checkExitConnectivityBFS soporta función isTileBlocked con firma (x, y)", () => {
            // Callback con 2 argumentos estilo mapNpcStorage
            const isBlocked2Args = (x: number, y: number) => x === 50 && y === 50;

            const resBlocked = checkExitConnectivityBFS(
                { map: 1, x: 50, y: 50 },
                { isTileBlocked: isBlocked2Args },
            );
            assert.equal(resBlocked.ok, false);
            assert.match(resBlocked.reason || "", /está bloqueado/);

            const resFree = checkExitConnectivityBFS(
                { map: 1, x: 51, y: 51 },
                { isTileBlocked: isBlocked2Args },
            );
            assert.equal(resFree.ok, true);
        });

        test("checkExitConnectivityBFS valida límites en esquina (1, 1) sin exigir más de 2 vecinos físicos", () => {
            // (1, 1) en la grilla solo tiene 2 vecinos físicos posibles: (1, 2) y (2, 1)
            const result = checkExitConnectivityBFS(
                { map: 1, x: 1, y: 1 },
                { minAccessibleNeighbors: 4 }, // No puede haber 4 físicamente en una esquina
            );
            assert.equal(result.ok, true);
            assert.equal(result.accessibleNeighbors, 2);
        });

        test("checkExitConnectivityBFS rechaza targetCoords fuera de límites o bloqueadas inmediatamente", () => {
            const resOutOfBounds = checkExitConnectivityBFS(
                { map: 1, x: 10, y: 10 },
                { targetCoords: { x: 105, y: 10 } },
            );
            assert.equal(resOutOfBounds.ok, false);
            assert.match(resOutOfBounds.reason || "", /fuera de límites/);

            const resTargetBlocked = checkExitConnectivityBFS(
                { map: 1, x: 10, y: 10 },
                {
                    targetCoords: { x: 20, y: 20 },
                    isTileBlocked: (_m, x, y) => x === 20 && y === 20,
                },
            );
            assert.equal(resTargetBlocked.ok, false);
            assert.match(resTargetBlocked.reason || "", /está bloqueada/);
        });

        test("withAtomicRollback aborta y no sobrescribe archivo si el JSON original está corrupto", async () => {
            const corruptFile = path.join(tempDir, "corrupted.json");
            await fs.writeFile(corruptFile, "{ esto_no_es_json_valido ", "utf8");

            await assert.rejects(
                () =>
                    withAtomicRollback(corruptFile, async (content) => {
                        return { dataToSave: { fixed: true }, result: true };
                    }),
                /JSON corrupto o inválido/,
            );

            // Verificar que el contenido corrupto original no fue borrado ni alterado
            const content = await fs.readFile(corruptFile, "utf8");
            assert.equal(content, "{ esto_no_es_json_valido ");
        });
    });
});
