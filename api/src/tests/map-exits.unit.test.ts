import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, test } from "vitest";

import {
    analyzeMapReachability,
    createBidirectionalExits,
    deleteMapExit,
    isDestinationBlocked,
    listMapExits,
    upsertMapExit,
} from "../repositories/mapExits";

const fixtures: string[] = [];

async function makeWorld(spec: {
    maps: Array<{
        id: number;
        exits?: Record<string, { map: number; x: number; y: number }>;
        blockedCells?: Array<[number, number]>;
    }>;
}): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openao-exits-"));
    fixtures.push(dir);
    for (const map of spec.maps) {
        const mapPath = path.join(dir, `mapa_${map.id}`);
        await fs.mkdir(mapPath, { recursive: true });
        const rows: number[][] = Array.from({ length: 100 }, () =>
            Array.from({ length: 100 }, () => 1),
        );
        for (const [x, y] of map.blockedCells ?? []) {
            rows[y - 1][x - 1] = 2;
        }
        await fs.writeFile(
            path.join(mapPath, "terrain.json"),
            JSON.stringify({
                id: map.id,
                width: 100,
                height: 100,
                palette: {
                    "1": { graphics: [1], blocked: false },
                    "2": { graphics: [2], blocked: true },
                },
                rows,
            }),
        );
        await fs.writeFile(
            path.join(mapPath, "specials.json"),
            JSON.stringify({
                id: map.id,
                exits: map.exits ?? {},
                objects: {},
                npcs: {},
                triggers: {},
            }),
        );
    }
    return dir;
}

afterEach(async () => {
    while (fixtures.length) {
        const dir = fixtures.pop();
        if (dir) await fs.rm(dir, { recursive: true, force: true });
    }
});

test("rejects exit to missing map and to blocked destination tile", async () => {
    const dir = await makeWorld({
        maps: [
            { id: 1, blockedCells: [] },
            { id: 2, blockedCells: [[50, 50]] },
        ],
    });

    await assert.rejects(
        () =>
            upsertMapExit(
                1,
                { x: 10, y: 10, targetMap: 99, targetX: 5, targetY: 5 },
                dir,
            ),
        /no existe/i,
    );

    await assert.rejects(
        () =>
            upsertMapExit(
                1,
                { x: 10, y: 10, targetMap: 2, targetX: 50, targetY: 50 },
                dir,
            ),
        /bloqueada/i,
    );

    assert.equal(await isDestinationBlocked(2, 50, 50, dir), true);
    assert.equal(await isDestinationBlocked(2, 51, 51, dir), false);
});

test("create/list/delete exits and bidirectional pair persist on disk", async () => {
    const dir = await makeWorld({
        maps: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });

    await upsertMapExit(
        1,
        { x: 9, y: 7, targetMap: 2, targetX: 9, targetY: 93 },
        dir,
    );
    const listed = await listMapExits(1, dir);
    assert.equal(listed.outbound.length, 1);
    assert.equal(listed.outbound[0].target.map, 2);

    const inboundOn2 = await listMapExits(2, dir);
    assert.ok(inboundOn2.inbound.some((entry) => entry.fromMap === 1));

    await createBidirectionalExits(
        {
            a: { map: 2, x: 1, y: 1 },
            b: { map: 3, x: 2, y: 2 },
        },
        dir,
    );
    const two = await listMapExits(2, dir);
    const three = await listMapExits(3, dir);
    assert.ok(two.outbound.some((e) => e.target.map === 3));
    assert.ok(three.outbound.some((e) => e.target.map === 2));

    await deleteMapExit(1, 9, 7, dir);
    assert.equal((await listMapExits(1, dir)).outbound.length, 0);
});

test("reachability lists maps with no inbound and BFS-unreachable maps", async () => {
    const dir = await makeWorld({
        maps: [
            { id: 1, exits: { "1,1": { map: 2, x: 5, y: 5 } } },
            { id: 2, exits: {} },
            { id: 3, exits: {} }, // island
        ],
    });

    const report = await analyzeMapReachability({
        entryMapId: 1,
        mapsSourceDir: dir,
    });
    assert.ok(report.noInbound.includes(3));
    assert.ok(report.unreachableFromEntry.includes(3));
    assert.equal(report.unreachableFromEntry.includes(2), false);
});
