import assert from "node:assert/strict";
import { afterAll, beforeAll, beforeEach, test } from "vitest";

import pool from "../db";
import {
    assertCanEditUserMap,
    createUserMap,
    getUserMapById,
    listVisibleUserMaps,
    updateUserMap,
    USER_MAP_ID_MIN,
} from "../repositories/userMaps";

const OWNER_A = "00000000-0000-4000-8000-0000000000a1";
const OWNER_B = "00000000-0000-4000-8000-0000000000b2";
let dbReady = false;
const created: number[] = [];

beforeAll(async () => {
    try {
        await pool.query("SELECT 1");
        await pool.query(`
          INSERT INTO accounts (id, name, email)
          VALUES
            ($1::uuid, 'UserMapOwnerA', 'usermap-a@example.com'),
            ($2::uuid, 'UserMapOwnerB', 'usermap-b@example.com')
          ON CONFLICT (id) DO NOTHING
        `, [OWNER_A, OWNER_B]);
        dbReady = true;
    } catch {
        dbReady = false;
    }
});

beforeEach(async () => {
    if (!dbReady) return;
    await pool.query(
        `DELETE FROM user_maps WHERE owner_account_id = ANY($1::uuid[])`,
        [[OWNER_A, OWNER_B]],
    );
    created.length = 0;
});

afterAll(async () => {
    if (!dbReady) return;
    await pool.query(
        `DELETE FROM user_maps WHERE owner_account_id = ANY($1::uuid[])`,
        [[OWNER_A, OWNER_B]],
    );
});

test("owner can create draft maps in reserved range and strangers cannot see drafts", async () => {
    if (!dbReady) return;
    const map = await createUserMap(OWNER_A, { name: "Mi Isla" });
    created.push(map.mapNum);
    assert.ok(map.mapNum >= USER_MAP_ID_MIN);
    assert.equal(map.status, "draft");
    assert.equal(map.allowCombat, false);

    const asStranger = await listVisibleUserMaps({ viewerAccountId: OWNER_B });
    assert.equal(
        asStranger.maps.some((entry) => entry.mapNum === map.mapNum),
        false,
    );

    await assert.rejects(
        () => getUserMapById(map.mapNum, OWNER_B),
        /not found/i,
    );

    const asOwner = await getUserMapById(map.mapNum, OWNER_A);
    assert.equal(asOwner.name, "Mi Isla");
});

test("non-owner edit is forbidden and quota errors are clear", async () => {
    if (!dbReady) return;
    const map = await createUserMap(OWNER_A, { name: "Privado" });
    await assert.rejects(
        () => assertCanEditUserMap(map.mapNum, OWNER_B),
        /No autorizado/,
    );

    // Force tiny quota via runtime_settings for this test account path by creating until default quota.
    for (let i = 0; i < 4; i += 1) {
        await createUserMap(OWNER_A, { name: `Extra ${i}` });
    }
    await assert.rejects(
        () => createUserMap(OWNER_A, { name: "Overflow" }),
        /Cuota de mapas/,
    );
});

test("published maps are visible and official portals are rejected", async () => {
    if (!dbReady) return;
    const map = await createUserMap(OWNER_A, { name: "Publicable" });
    await updateUserMap(map.mapNum, OWNER_A, { status: "published" });
    const visible = await listVisibleUserMaps({ viewerAccountId: OWNER_B });
    assert.equal(
        visible.maps.some((entry) => entry.mapNum === map.mapNum),
        true,
    );

    await assert.rejects(
        () =>
            updateUserMap(map.mapNum, OWNER_A, {
                metadata: { portalToOfficial: 1 },
            }),
        /mundo oficial/,
    );
});
