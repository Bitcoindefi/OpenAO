import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, test } from "vitest";
import {
    createExitPair,
    deleteMapExit,
    findMapsWithoutIncomingExits,
    findOrphanExits,
    findUnreachableMaps,
    listMapExits,
    listMapExitsWithIncoming,
    setMapExit,
} from "../lib/mapExitStorage";

describe("mapExitStorage - salidas entre mapas (#10)", () => {
    let dir: string;
    const dirs: string[] = [];

    async function makeMap(id: number, blocked: Array<[number, number]> = []) {
        const rows = Array.from({ length: 100 }, () => Array(100).fill(1));
        for (const [x, y] of blocked) rows[y - 1][x - 1] = 2;
        const mapDir = path.join(dir, `mapa_${id}`);
        await fs.mkdir(mapDir, { recursive: true });
        await fs.writeFile(
            path.join(mapDir, "terrain.json"),
            JSON.stringify({ id, width: 100, height: 100, palette: { "1": { graphics: [1] }, "2": { graphics: [2], blocked: true } }, rows }),
        );
        await fs.writeFile(path.join(mapDir, "specials.json"), JSON.stringify({ id, exits: {}, objects: { "1,1": 3 } }));
    }

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), "openao-exit-test-"));
        dirs.push(dir);
        await makeMap(1);
        await makeMap(2, [[10, 10]]);
        await makeMap(3);
    });

    afterAll(async () => {
        await Promise.all(dirs.map((d) => fs.rm(d, { recursive: true, force: true })));
    });

    test("crea, modifica y borra una salida, y persiste sin tocar otras claves", async () => {
        const created = await setMapExit(dir, 1, 5, 5, { map: 2, x: 20, y: 20 });
        assert.ok(created.ok && created.created);

        const updated = await setMapExit(dir, 1, 5, 5, { map: 3, x: 1, y: 1 });
        assert.ok(updated.ok && !updated.created);
        assert.ok(updated.ok && updated.warnings.length === 1);

        const onDisk = JSON.parse(await fs.readFile(path.join(dir, "mapa_1", "specials.json"), "utf8"));
        assert.deepEqual(onDisk.exits["5,5"], { map: 3, x: 1, y: 1 });
        assert.deepEqual(onDisk.objects, { "1,1": 3 });

        const deleted = await deleteMapExit(dir, 1, 5, 5);
        assert.ok(deleted.ok && deleted.warnings.length === 1);
        assert.equal((await listMapExits(dir, 1)).length, 0);
        assert.equal((await deleteMapExit(dir, 1, 5, 5)).ok, false);
    });

    test("rechaza destino a mapa inexistente", async () => {
        const res = await setMapExit(dir, 1, 5, 5, { map: 99, x: 1, y: 1 });
        assert.equal(res.ok, false);
        assert.equal((await listMapExits(dir, 1)).length, 0);
    });

    test("rechaza destino a tile bloqueado", async () => {
        const res = await setMapExit(dir, 1, 5, 5, { map: 2, x: 10, y: 10 });
        assert.equal(res.ok, false);
        if (!res.ok) assert.match(res.reason, /bloqueado/);
        assert.equal((await listMapExits(dir, 1)).length, 0);
    });

    test("rechaza destino fuera de la grilla", async () => {
        assert.equal((await setMapExit(dir, 1, 5, 5, { map: 2, x: 0, y: 5 })).ok, false);
        assert.equal((await setMapExit(dir, 1, 5, 5, { map: 2, x: 101, y: 5 })).ok, false);
    });

    test("crea ida y vuelta en una operación", async () => {
        const res = await createExitPair(dir, { from: { map: 1, x: 5, y: 5 }, to: { map: 2, x: 20, y: 20 } });
        assert.ok(res.ok);
        assert.deepEqual((await listMapExits(dir, 1))[0].destination, { map: 2, x: 20, y: 20 });
        assert.deepEqual((await listMapExits(dir, 2))[0], { mapNum: 2, x: 20, y: 20, destination: { map: 1, x: 5, y: 5 } });
    });

    test("la pareja es atómica: un lado inválido no escribe nada", async () => {
        const res = await createExitPair(dir, { from: { map: 1, x: 5, y: 5 }, to: { map: 2, x: 20, y: 20 } }, { from: { map: 2, x: 20, y: 20 }, to: { map: 1, x: 5, y: 5 } });
        assert.ok(res.ok);
        const bad = await createExitPair(dir, { from: { map: 1, x: 6, y: 6 }, to: { map: 2, x: 10, y: 10 } });
        assert.equal(bad.ok, false);
        assert.equal((await listMapExits(dir, 1)).length, 1);
        assert.equal((await listMapExits(dir, 2)).length, 1);
    });

    test("lista entrantes, huérfanas y mapas inalcanzables", async () => {
        await createExitPair(dir, { from: { map: 1, x: 5, y: 5 }, to: { map: 2, x: 20, y: 20 } });
        const info = await listMapExitsWithIncoming(dir, 2);
        assert.equal(info.incoming.length, 1);
        assert.deepEqual(await findUnreachableMaps(dir, [1]), [3]);
        assert.deepEqual(await findMapsWithoutIncomingExits(dir), [3]);

        await fs.writeFile(path.join(dir, "mapa_3", "specials.json"), JSON.stringify({ id: 3, exits: { "2,2": { map: 77, x: 1, y: 1 } } }));
        const orphans = await findOrphanExits(dir);
        assert.equal(orphans.length, 1);
        assert.equal(orphans[0].destination.map, 77);
    });
});
