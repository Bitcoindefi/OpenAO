import assert from "node:assert/strict";
import { afterAll, beforeAll, beforeEach, test } from "vitest";

import pool from "../db";
import {
    addMapModerator,
    approveUserMap,
    ensureDraftUserMapForTests,
    listModerationQueue,
    proposeUserMap,
    rejectUserMap,
    reportPublishedUserMap,
    unpublishUserMap,
} from "../repositories/mapModeration";

const OWNER = "00000000-0000-4000-8000-0000000000c1";
const MOD = "00000000-0000-4000-8000-0000000000c2";
const PLAYER_A = "00000000-0000-4000-8000-0000000000c3";
const PLAYER_B = "00000000-0000-4000-8000-0000000000c4";
const PLAYER_C = "00000000-0000-4000-8000-0000000000c5";
const MAP_NUM = 610;
let dbReady = false;

const goodTiles = [
    { x: 50, y: 50, blocked: false },
    { x: 51, y: 50, blocked: false },
    { x: 52, y: 50, blocked: false },
];

beforeAll(async () => {
    try {
        await pool.query("SELECT 1");
        await pool.query(
            `
          INSERT INTO accounts (id, name, email)
          VALUES
            ($1::uuid, 'MapModOwner', 'mapmod-owner@example.com'),
            ($2::uuid, 'MapModReviewer', 'mapmod-reviewer@example.com'),
            ($3::uuid, 'MapModPlayerA', 'mapmod-a@example.com'),
            ($4::uuid, 'MapModPlayerB', 'mapmod-b@example.com'),
            ($5::uuid, 'MapModPlayerC', 'mapmod-c@example.com')
          ON CONFLICT (id) DO NOTHING
        `,
            [OWNER, MOD, PLAYER_A, PLAYER_B, PLAYER_C],
        );
        dbReady = true;
    } catch {
        dbReady = false;
    }
});

beforeEach(async () => {
    if (!dbReady) return;
    await pool.query(`DELETE FROM user_map_reports WHERE map_num = $1`, [MAP_NUM]);
    await pool.query(`DELETE FROM user_map_review_events WHERE map_num = $1`, [
        MAP_NUM,
    ]);
    await pool.query(`DELETE FROM user_maps WHERE map_num = $1`, [MAP_NUM]);
    await pool.query(`DELETE FROM map_moderators WHERE account_id = $1`, [MOD]);
    await ensureDraftUserMapForTests({
        mapNum: MAP_NUM,
        ownerAccountId: OWNER,
        name: "Arena de Prueba",
    });
    await addMapModerator(MOD, MOD, "seed reviewer");
});

afterAll(async () => {
    if (!dbReady) return;
    await pool.query(`DELETE FROM user_map_reports WHERE map_num = $1`, [MAP_NUM]);
    await pool.query(`DELETE FROM user_map_review_events WHERE map_num = $1`, [
        MAP_NUM,
    ]);
    await pool.query(`DELETE FROM user_maps WHERE map_num = $1`, [MAP_NUM]);
    await pool.query(`DELETE FROM map_moderators WHERE account_id = $1`, [MOD]);
});

test("full moderation flow: propose -> approve; reject requires reason; reports requeue; unpublish", async () => {
    if (!dbReady) return;

    const proposed = await proposeUserMap(MAP_NUM, OWNER, {
        tiles: goodTiles,
        spawnPoint: { x: 50, y: 50 },
        texts: ["Cartel limpio"],
    });
    assert.equal(proposed.queued, true);
    assert.equal(proposed.map.status, "proposed");

    const queue = await listModerationQueue();
    assert.ok(queue.maps.some((entry) => entry.mapNum === MAP_NUM));

    const approved = await approveUserMap(MAP_NUM, MOD);
    assert.equal(approved.status, "published");

    await assert.rejects(
        () => rejectUserMap(MAP_NUM, MOD, "  "),
        /motivo/,
    );

    // Reset to proposed via draft repropose path after forcing draft.
    await pool.query(
        `UPDATE user_maps SET status = 'draft', rejection_reason = NULL WHERE map_num = $1`,
        [MAP_NUM],
    );
    await proposeUserMap(MAP_NUM, OWNER, {
        tiles: goodTiles,
        spawnPoint: { x: 50, y: 50 },
    });
    const rejected = await rejectUserMap(
        MAP_NUM,
        MOD,
        "Graficos sospechosos de plagio",
    );
    assert.equal(rejected.status, "rejected");
    assert.match(rejected.rejectionReason ?? "", /plagio/);

    await pool.query(
        `UPDATE user_maps SET status = 'published', rejection_reason = NULL WHERE map_num = $1`,
        [MAP_NUM],
    );
    const r1 = await reportPublishedUserMap(MAP_NUM, PLAYER_A, "Ofensivo");
    assert.equal(r1.returnedToQueue, false);
    await reportPublishedUserMap(MAP_NUM, PLAYER_B, "Plagio");
    const r3 = await reportPublishedUserMap(MAP_NUM, PLAYER_C, "Trampa");
    assert.equal(r3.returnedToQueue, true);
    assert.equal(r3.map.status, "in_review");

    const unpublished = await unpublishUserMap(
        MAP_NUM,
        MOD,
        "Confirmado: contenido inaceptable",
    );
    assert.equal(unpublished.status, "rejected");
});

test("auto pre-check keeps failing maps out of the human queue", async () => {
    if (!dbReady) return;
    const result = await proposeUserMap(MAP_NUM, OWNER, {
        name: "hack zone",
        tiles: [{ x: 50, y: 50, blocked: true }],
        spawnPoint: { x: 50, y: 50 },
    });
    assert.equal(result.queued, false);
    assert.equal(result.map.status, "rejected");
    assert.ok((result.map.rejectionReason ?? "").includes("automaticamente"));
});
