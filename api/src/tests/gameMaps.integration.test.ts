import assert from "node:assert/strict";
import { afterAll, afterEach, beforeAll, test } from "vitest";
import pool from "../db";
import { importSourceMaps, getGameMapById, upsertGameMap } from "../repositories/gameMaps";

const TEST_MAP_ID = 999_999;

beforeAll(async () => {
    await pool.query("DELETE FROM game_data_revisions WHERE kind = 'maps' AND entity_id = $1", [TEST_MAP_ID]);
    await pool.query("DELETE FROM game_maps WHERE id = $1", [TEST_MAP_ID]);
});

afterAll(async () => {
    await pool.query("DELETE FROM game_data_revisions WHERE kind = 'maps' AND entity_id = $1", [TEST_MAP_ID]);
    await pool.query("DELETE FROM game_maps WHERE id = $1", [TEST_MAP_ID]);
    await pool.end();
});

afterEach(async () => {
    await pool.query("DELETE FROM game_data_revisions WHERE kind = 'maps' AND entity_id = $1", [TEST_MAP_ID]);
    await pool.query("DELETE FROM game_maps WHERE id = $1", [TEST_MAP_ID]);
});

test("imports all source maps once and does not duplicate revisions on a second import", async () => {
    await importSourceMaps();
    const revisionsBefore = await countRevisions(1);
    const map = await getGameMapById(1);
    const secondImport = await importSourceMaps();
    const revisionsAfter = await countRevisions(1);

    assert.equal(map?.id, 1);
    assert.equal(map?.data.meta.id, 1);
    assert.equal(secondImport.imported, 0);
    assert.equal(secondImport.missing, 0);
    assert.equal(revisionsAfter, revisionsBefore);

    const count = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM game_maps");
    assert.equal(Number(count.rows[0]?.count), 294);
});

test("an edited map is read from DB with a revision and checksum", async () => {
    const data = {
        meta: { id: TEST_MAP_ID, name: "Mapa de prueba" },
        terrain: { width: 100, height: 100, palette: {}, rows: [] },
        specials: { exits: {}, objects: {}, npcs: {}, triggers: {} },
        npcs: [],
    };

    const first = await upsertGameMap(TEST_MAP_ID, data);
    const stored = await getGameMapById(TEST_MAP_ID);

    assert.equal(first.unchanged, false);
    assert.equal(stored?.name, "Mapa de prueba");
    assert.equal(stored?.checksum, first.map?.checksum);
    assert.equal(await countRevisions(TEST_MAP_ID), 1);
});

test("the importer preserves an edited DB map", async () => {
    await importSourceMaps();

    const editedData = {
        meta: { id: 1, name: "Mapa editado" },
        terrain: { width: 10, height: 10, palette: {}, rows: [] },
        specials: { exits: {}, objects: {}, npcs: {}, triggers: {} },
        npcs: [],
    };

    await upsertGameMap(1, editedData);
    await importSourceMaps();
    const map = await getGameMapById(1);

    assert.equal(map?.name, "Mapa editado");
});

test("an unchanged map edit does not create another revision", async () => {
    const data = {
        meta: { id: TEST_MAP_ID, name: "Mapa de prueba" },
        terrain: { width: 100, height: 100, palette: {}, rows: [] },
        specials: { exits: {}, objects: {}, npcs: {}, triggers: {} },
        npcs: [],
    };

    const first = await upsertGameMap(TEST_MAP_ID, data);
    const second = await upsertGameMap(TEST_MAP_ID, data);

    assert.equal(first.unchanged, false);
    assert.equal(second.unchanged, true);
    assert.equal(await countRevisions(TEST_MAP_ID), 1);
});

async function countRevisions(mapId: number): Promise<number> {
    const result = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM game_data_revisions WHERE kind = 'maps' AND entity_id = $1",
        [mapId],
    );
    return Number(result.rows[0]?.count ?? 0);
}
