import assert from "node:assert/strict";
import { beforeAll, afterEach, test } from "vitest";
import pool from "../db";
import {
    ensureApiReady,
    registerAccount,
    requestJson,
} from "./helpers/api";

const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "AdminTest123";
const ADMIN_PROXY_TOKEN = "test-admin-proxy-token";

let adminSessionToken: string;

async function adminRequest<T>(
    path: string,
    init?: RequestInit,
): Promise<{ status: number; ok: boolean; data: T }> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${adminSessionToken}`);
    headers.set("x-game-data-admin-token", ADMIN_PROXY_TOKEN);
    if (!headers.has("Content-Type") && init?.method !== "GET") {
        headers.set("Content-Type", "application/json");
    }
    return requestJson<T>(path, { ...init, headers });
}

async function cleanupMap(mapNum: number): Promise<void> {
    await pool.query(
        `DELETE FROM game_map_tile_overrides WHERE map_num = $1`,
        [mapNum],
    );
}

beforeAll(async () => {
    await ensureApiReady();

    try {
        const session = await registerAccount(
            "Admin Tiles",
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        );
        adminSessionToken = session.sessionToken;
    } catch {
        const loginResponse = await requestJson<
            { sessionToken?: string; error?: string }
        >("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
            }),
        });
        if (loginResponse.ok && loginResponse.data.sessionToken) {
            adminSessionToken = loginResponse.data.sessionToken;
        } else {
            throw new Error(
                "Could not authenticate as admin for tile tests",
            );
        }
    }
});

afterEach(async () => {
    await cleanupMap(1);
});

const TEST_MAP = 1;

test("paint a single tile and verify it persists", async () => {
    const paintResponse = await adminRequest<{
        applied?: number;
        error?: string;
    }>(`/admin/game-data/maps/${TEST_MAP}/tiles`, {
        method: "PUT",
        body: JSON.stringify({
            tiles: [{ x: 10, y: 10, layer: 1, grhIndex: 5500 }],
        }),
    });

    assert.equal(paintResponse.ok, true, JSON.stringify(paintResponse.data));
    assert.equal(paintResponse.data.applied, 1);

    const overrides = await adminRequest<{
        overrides?: Array<{
            x: number;
            y: number;
            layer: number;
            grhIndex: number | null;
        }>;
    }>(`/maps/${TEST_MAP}/overrides`);

    assert.equal(overrides.ok, true);
    const tile = overrides.data.overrides?.find(
        (o) => o.x === 10 && o.y === 10 && o.layer === 1,
    );
    assert.ok(tile, "Painted tile should appear in overrides");
    assert.equal(tile.grhIndex, 5500);
});

test("paint a 20x20 rectangle atomically", async () => {
    const response = await adminRequest<{
        applied?: number;
        error?: string;
    }>(`/admin/game-data/maps/${TEST_MAP}/tiles/paint-rectangle`, {
        method: "POST",
        body: JSON.stringify({
            startX: 1,
            startY: 1,
            endX: 20,
            endY: 20,
            layer: 1,
            grhIndex: 5500,
        }),
    });

    assert.equal(response.ok, true, JSON.stringify(response.data));
    assert.equal(response.data.applied, 400);

    const overrides = await adminRequest<{
        overrides?: Array<{ x: number; y: number }>;
    }>(`/maps/${TEST_MAP}/overrides`);

    assert.equal(overrides.ok, true);
    assert.equal(overrides.data.overrides?.length, 400);
});

test("out-of-range coordinates return 400 without corrupting data", async () => {
    const beforeResponse = await adminRequest<{ applied?: number }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles`,
        {
            method: "PUT",
            body: JSON.stringify({
                tiles: [{ x: 50, y: 50, layer: 1, grhIndex: 5500 }],
            }),
        },
    );
    assert.equal(beforeResponse.ok, true);

    const invalidResponses = await Promise.all([
        adminRequest<{ error?: string }>(
            `/admin/game-data/maps/${TEST_MAP}/tiles`,
            {
                method: "PUT",
                body: JSON.stringify({
                    tiles: [{ x: 0, y: 50, layer: 1, grhIndex: 5500 }],
                }),
            },
        ),
        adminRequest<{ error?: string }>(
            `/admin/game-data/maps/${TEST_MAP}/tiles`,
            {
                method: "PUT",
                body: JSON.stringify({
                    tiles: [{ x: 101, y: 50, layer: 1, grhIndex: 5500 }],
                }),
            },
        ),
        adminRequest<{ error?: string }>(
            `/admin/game-data/maps/${TEST_MAP}/tiles`,
            {
                method: "PUT",
                body: JSON.stringify({
                    tiles: [{ x: 50, y: 0, layer: 1, grhIndex: 5500 }],
                }),
            },
        ),
        adminRequest<{ error?: string }>(
            `/admin/game-data/maps/${TEST_MAP}/tiles`,
            {
                method: "PUT",
                body: JSON.stringify({
                    tiles: [{ x: 50, y: 101, layer: 1, grhIndex: 5500 }],
                }),
            },
        ),
    ]);

    for (const res of invalidResponses) {
        assert.equal(
            res.status,
            400,
            `Expected 400 for invalid coords, got ${res.status}`,
        );
    }

    const afterOverrides = await adminRequest<{
        overrides?: Array<{ x: number; y: number; layer: number }>;
    }>(`/maps/${TEST_MAP}/overrides`);
    const originalTile = afterOverrides.data.overrides?.find(
        (o) => o.x === 50 && o.y === 50 && o.layer === 1,
    );
    assert.ok(
        originalTile,
        "Original tile should still exist after failed operations",
    );
});

test("invalid graphic index returns 400 without corrupting data", async () => {
    const invalidGraphic = 1000001;
    const response = await adminRequest<{ error?: string }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles`,
        {
            method: "PUT",
            body: JSON.stringify({
                tiles: [{ x: 5, y: 5, layer: 1, grhIndex: invalidGraphic }],
            }),
        },
    );

    assert.equal(response.status, 400);
    assert.ok(response.data.error?.includes(String(invalidGraphic)));

    const overrides = await adminRequest<{
        overrides?: Array<{ x: number; y: number; layer: number }>;
    }>(`/maps/${TEST_MAP}/overrides`);
    const badTile = overrides.data.overrides?.find(
        (o) => o.x === 5 && o.y === 5 && o.layer === 1,
    );
    assert.equal(
        badTile,
        undefined,
        "Invalid tile should not exist after failed operation",
    );
});

test("blocked flag is persisted on tile", async () => {
    const response = await adminRequest<{
        applied?: number;
        error?: string;
    }>(`/admin/game-data/maps/${TEST_MAP}/tiles`, {
        method: "PUT",
        body: JSON.stringify({
            tiles: [{ x: 25, y: 25, layer: 1, blocked: true }],
        }),
    });

    assert.equal(response.ok, true, JSON.stringify(response.data));

    const regionResponse = await adminRequest<{
        overrides?: Array<{
            x: number;
            y: number;
            blocked: boolean | null;
        }>;
    }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles/region?startX=25&startY=25&endX=25&endY=25`,
    );

    assert.equal(regionResponse.ok, true);
    const tile = regionResponse.data.overrides?.find(
        (o) => o.x === 25 && o.y === 25,
    );
    assert.ok(tile, "Blocked tile should exist");
    assert.equal(tile.blocked, true);
});

test("failed operation leaves map unchanged (rollback on invalid graphic in batch)", async () => {
    const invalidGraphic = 1000099;

    await adminRequest<{ applied?: number }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles`,
        {
            method: "PUT",
            body: JSON.stringify({
                tiles: [{ x: 70, y: 70, layer: 1, grhIndex: 5500 }],
            }),
        },
    );

    const response = await adminRequest<{ error?: string }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles`,
        {
            method: "PUT",
            body: JSON.stringify({
                tiles: [
                    { x: 71, y: 71, layer: 1, grhIndex: 5500 },
                    { x: 72, y: 72, layer: 1, grhIndex: invalidGraphic },
                ],
            }),
        },
    );

    assert.equal(response.status, 400);

    const overrides = await adminRequest<{
        overrides?: Array<{ x: number; y: number; layer: number }>;
    }>(`/maps/${TEST_MAP}/overrides`);

    const tile71 = overrides.data.overrides?.find(
        (o) => o.x === 71 && o.y === 71 && o.layer === 1,
    );
    assert.equal(
        tile71,
        undefined,
        "Tile 71 should not exist — batch rolled back",
    );

    const tile70 = overrides.data.overrides?.find(
        (o) => o.x === 70 && o.y === 70 && o.layer === 1,
    );
    assert.ok(
        tile70,
        "Tile 70 from the previous valid paint should still exist",
    );
});

test("region query returns only tiles within bounds", async () => {
    await adminRequest<{ applied?: number }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles`,
        {
            method: "PUT",
            body: JSON.stringify({
                tiles: [
                    { x: 30, y: 30, layer: 1, grhIndex: 5500 },
                    { x: 35, y: 35, layer: 1, grhIndex: 5501 },
                    { x: 60, y: 60, layer: 1, grhIndex: 5502 },
                ],
            }),
        },
    );

    const response = await adminRequest<{
        overrides?: Array<{ x: number; y: number }>;
    }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles/region?startX=28&startY=28&endX=36&endY=36`,
    );

    assert.equal(response.ok, true, JSON.stringify(response.data));
    const xs = response.data.overrides?.map((o) => o.x) ?? [];
    assert.ok(xs.includes(30), "Should include tile at x=30");
    assert.ok(xs.includes(35), "Should include tile at x=35");
    assert.ok(
        !xs.includes(60),
        "Should not include tile at x=60 (out of region)",
    );
});

test("paint-rectangle with blocked=true returns isolatedRegions field", async () => {
    const response = await adminRequest<{
        applied?: number;
        isolatedRegions?: boolean;
        error?: string;
    }>(`/admin/game-data/maps/${TEST_MAP}/tiles/paint-rectangle`, {
        method: "POST",
        body: JSON.stringify({
            startX: 45,
            startY: 45,
            endX: 55,
            endY: 55,
            layer: 1,
            blocked: true,
        }),
    });

    assert.equal(response.ok, true, JSON.stringify(response.data));
    assert.equal(typeof response.data.isolatedRegions, "boolean");
});

test("blocked-check returns valid result on clean map", async () => {
    const response = await adminRequest<{
        isolated?: boolean;
        unreachableCount?: number;
    }>(`/admin/game-data/maps/${TEST_MAP}/tiles/blocked-check`, {
        method: "POST",
    });

    assert.equal(response.ok, true, JSON.stringify(response.data));
    assert.equal(typeof response.data.isolated, "boolean");
    assert.equal(typeof response.data.unreachableCount, "number");
});

test("blocked-check detects isolated region after blocking a ring", async () => {
    const ringResponse1 = await adminRequest<{ applied?: number }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles/paint-rectangle`,
        {
            method: "POST",
            body: JSON.stringify({
                startX: 45,
                startY: 45,
                endX: 55,
                endY: 45,
                layer: 1,
                blocked: true,
            }),
        },
    );
    assert.equal(ringResponse1.ok, true);

    const ringResponse2 = await adminRequest<{ applied?: number }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles/paint-rectangle`,
        {
            method: "POST",
            body: JSON.stringify({
                startX: 45,
                startY: 55,
                endX: 55,
                endY: 55,
                layer: 1,
                blocked: true,
            }),
        },
    );
    assert.equal(ringResponse2.ok, true);

    const ringResponse3 = await adminRequest<{ applied?: number }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles/paint-rectangle`,
        {
            method: "POST",
            body: JSON.stringify({
                startX: 45,
                startY: 45,
                endX: 45,
                endY: 55,
                layer: 1,
                blocked: true,
            }),
        },
    );
    assert.equal(ringResponse3.ok, true);

    const ringResponse4 = await adminRequest<{ applied?: number }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles/paint-rectangle`,
        {
            method: "POST",
            body: JSON.stringify({
                startX: 55,
                startY: 45,
                endX: 55,
                endY: 55,
                layer: 1,
                blocked: true,
            }),
        },
    );
    assert.equal(ringResponse4.ok, true);

    const response = await adminRequest<{
        isolated?: boolean;
        unreachableCount?: number;
    }>(`/admin/game-data/maps/${TEST_MAP}/tiles/blocked-check`, {
        method: "POST",
    });

    assert.equal(response.ok, true, JSON.stringify(response.data));
    assert.equal(response.data.isolated, true);
    assert.ok(
        (response.data.unreachableCount ?? 0) > 0,
        "Should have unreachable tiles inside the ring",
    );
});

test("tile array size limit rejects 501 tiles", async () => {
    const tiles = Array.from({ length: 501 }, (_, i) => ({
        x: (i % 100) + 1,
        y: Math.floor(i / 100) + 1,
        layer: 1,
        grhIndex: 5500,
    }));

    const response = await adminRequest<{ error?: string }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles`,
        {
            method: "PUT",
            body: JSON.stringify({ tiles }),
        },
    );

    assert.equal(response.status, 400);
});

test("rectangle size limit rejects >500 tiles", async () => {
    const response = await adminRequest<{ error?: string }>(
        `/admin/game-data/maps/${TEST_MAP}/tiles/paint-rectangle`,
        {
            method: "POST",
            body: JSON.stringify({
                startX: 1,
                startY: 1,
                endX: 25,
                endY: 25,
                layer: 1,
                grhIndex: 5500,
            }),
        },
    );

    assert.equal(response.status, 400);
});
