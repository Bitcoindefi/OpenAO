import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterAll, beforeEach, test } from "vitest";

import pool from "../db";
import {
    getGameMapById,
    importGameMapsFromSource,
    upsertGameMap,
} from "../repositories/gameMaps";

const TEST_MAP_IDS = [9901, 9902];
let fixtureDir: string | null = null;

async function writeJson(filePath: string, value: unknown): Promise<void> {
    await fs.writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function buildMapFixture(id: number, name: string) {
    return {
        metadata: {
            id,
            name,
            musicNum: 1,
            magiaSinEfecto: 0,
            noEncriptarMp: 0,
            terreno: "BOSQUE",
            zona: "CAMPO",
            restringir: "No",
            minLevel: 0,
            maxLevel: 0,
            backup: 1,
            pk: 1,
        },
        terrain: {
            id,
            width: 2,
            height: 2,
            palette: {
                "1": { graphics: [100, 101] },
                "2": { graphics: 200, blocked: true },
            },
            rows: [
                [1, 2],
                [2, 1],
            ],
        },
        npcs: [{ mapNum: id, x: 1, y: 2, npcIndex: 7, movement: 0 }],
        specials: {
            id,
            exits: { "2,2": { map: 1, x: 50, y: 50 } },
            objects: { "1,1": { objIndex: 10, amount: 1 } },
            npcs: { "1,2": 7 },
            triggers: { "2,1": 5 },
        },
    };
}

async function createMapFixtureDir(): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openao-maps-"));

    for (const mapId of TEST_MAP_IDS) {
        const map = buildMapFixture(mapId, `Fixture ${mapId}`);
        const mapDir = path.join(root, `mapa_${mapId}`);
        await fs.mkdir(mapDir, { recursive: true });
        await writeJson(path.join(mapDir, "meta.json"), map.metadata);
        await writeJson(path.join(mapDir, "terrain.json"), map.terrain);
        await writeJson(path.join(mapDir, "npcs.json"), map.npcs);
        await writeJson(path.join(mapDir, "specials.json"), map.specials);
    }

    return root;
}

async function cleanTestMaps(): Promise<void> {
    await pool.query(
        "DELETE FROM game_data_revisions WHERE kind = 'maps' AND entity_id = ANY($1::int[])",
        [TEST_MAP_IDS],
    );
    await pool.query("DELETE FROM game_maps WHERE id = ANY($1::int[])", [
        TEST_MAP_IDS,
    ]);
}

async function countMapRevisions(mapId: number): Promise<number> {
    const result = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM game_data_revisions WHERE kind = 'maps' AND entity_id = $1",
        [mapId],
    );

    return Number(result.rows[0]?.count ?? 0);
}

beforeEach(async () => {
    if (!fixtureDir) {
        fixtureDir = await createMapFixtureDir();
    }
    await cleanTestMaps();
});

afterAll(async () => {
    await cleanTestMaps();
    if (fixtureDir) {
        await fs.rm(fixtureDir, { recursive: true, force: true });
    }
});

test("map source import is idempotent and records revisions once", async () => {
    assert.ok(fixtureDir);

    const firstImport = await importGameMapsFromSource(fixtureDir);
    const secondImport = await importGameMapsFromSource(fixtureDir);

    assert.deepEqual(firstImport, { total: 2, changed: 2, unchanged: 0 });
    assert.deepEqual(secondImport, { total: 2, changed: 0, unchanged: 2 });
    assert.equal(await countMapRevisions(TEST_MAP_IDS[0]), 1);
    assert.equal(await countMapRevisions(TEST_MAP_IDS[1]), 1);
});

test("updated maps are served from DB and advance the map revision", async () => {
    assert.ok(fixtureDir);

    await importGameMapsFromSource(fixtureDir);
    const original = await getGameMapById(TEST_MAP_IDS[0], fixtureDir);
    const updatedData = {
        ...original.data,
        metadata: {
            ...original.data.metadata,
            name: "Fixture 9901 Edited",
        },
    };

    const update = await upsertGameMap(TEST_MAP_IDS[0], updatedData);
    const loaded = await getGameMapById(TEST_MAP_IDS[0], fixtureDir);

    assert.equal(update.unchanged, false);
    assert.equal(loaded.source, "db");
    assert.equal(loaded.name, "Fixture 9901 Edited");
    assert.equal(loaded.data.metadata.name, "Fixture 9901 Edited");
    assert.ok(loaded.version > original.version);
    assert.equal(await countMapRevisions(TEST_MAP_IDS[0]), 2);
});

test("unimported maps keep file fallback behavior", async () => {
    assert.ok(fixtureDir);

    const loaded = await getGameMapById(TEST_MAP_IDS[1], fixtureDir);

    assert.equal(loaded.source, "file");
    assert.equal(loaded.version, 0);
    assert.equal(loaded.name, "Fixture 9902");
    assert.deepEqual(loaded.data.terrain.rows, [
        [1, 2],
        [2, 1],
    ]);
    assert.equal(await countMapRevisions(TEST_MAP_IDS[1]), 0);
});
