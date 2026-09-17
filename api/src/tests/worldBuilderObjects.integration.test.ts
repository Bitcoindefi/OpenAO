import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pool from "../db";
import {
    listMapDoors,
    listMapObjects,
    moveMapObject,
    placeMapObject,
    placeStructure,
    publishMap,
    removeMapObject,
    setDoorState,
} from "../repositories/worldBuilder";

const TEST_ACCOUNT_ID = randomUUID();
const TEST_MAP_NUM = 900_009;
const TEST_OBJECT_ID = 2_000_000_009;

async function cleanTestData(): Promise<void> {
    await pool.query("DELETE FROM game_map_door_overrides WHERE map_num = $1", [
        TEST_MAP_NUM,
    ]);
    await pool.query("DELETE FROM game_map_object_overrides WHERE map_num = $1", [
        TEST_MAP_NUM,
    ]);
    await pool.query("DELETE FROM game_map_tile_overrides WHERE map_num = $1", [
        TEST_MAP_NUM,
    ]);
    await pool.query("DELETE FROM game_objects WHERE id = $1", [TEST_OBJECT_ID]);
    await pool.query("DELETE FROM accounts WHERE id = $1", [TEST_ACCOUNT_ID]);
}

beforeAll(async () => {
    await cleanTestData();
    await pool.query(
        `INSERT INTO accounts (id, name, email)
         VALUES ($1, $2, $3)`,
        [
            TEST_ACCOUNT_ID,
            "World Builder Test",
            `world-builder-${TEST_ACCOUNT_ID}@example.test`,
        ],
    );
    await pool.query(
        `INSERT INTO game_objects (id, name, obj_type, data, checksum)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [TEST_OBJECT_ID, "Integration object", 1, "{}", "test-checksum"],
    );
});

afterAll(async () => {
    await cleanTestData();
});

describe("world builder object persistence (#9)", () => {
    it("places, publishes, moves and removes an object", async () => {
        await placeMapObject(
            {
                mapNum: TEST_MAP_NUM,
                x: 10,
                y: 11,
                objIndex: TEST_OBJECT_ID,
                amount: 7,
            },
            TEST_ACCOUNT_ID,
        );

        expect(await listMapObjects(TEST_MAP_NUM, false)).toEqual([]);
        expect(await listMapObjects(TEST_MAP_NUM, true)).toEqual([
            expect.objectContaining({
                x: 10,
                y: 11,
                objIndex: TEST_OBJECT_ID,
                amount: 7,
                status: "draft",
            }),
        ]);

        await publishMap(TEST_MAP_NUM, TEST_ACCOUNT_ID);
        expect(await listMapObjects(TEST_MAP_NUM, false)).toEqual([
            expect.objectContaining({ x: 10, y: 11, status: "published" }),
        ]);

        await moveMapObject(
            {
                mapNum: TEST_MAP_NUM,
                fromX: 10,
                fromY: 11,
                toX: 12,
                toY: 13,
            },
            TEST_ACCOUNT_ID,
        );
        expect(await listMapObjects(TEST_MAP_NUM, false)).toEqual([
            expect.objectContaining({ x: 12, y: 13, amount: 7 }),
        ]);

        await expect(removeMapObject(TEST_MAP_NUM, 12, 13)).resolves.toEqual({
            ok: true,
        });
        expect(await listMapObjects(TEST_MAP_NUM, true)).toEqual([]);
    });

    it("rejects an object that is not in the catalog", async () => {
        await expect(
            placeMapObject(
                {
                    mapNum: TEST_MAP_NUM,
                    x: 20,
                    y: 20,
                    objIndex: TEST_OBJECT_ID - 1,
                    amount: 1,
                },
                TEST_ACCOUNT_ID,
            ),
        ).rejects.toThrow("no existe");
    });
});

describe("world builder structures and doors (#9)", () => {
    it("persists door graphics and collision state", async () => {
        await setDoorState(
            {
                mapNum: TEST_MAP_NUM,
                x: 80,
                y: 80,
                isOpen: false,
                openGrhIndex: 101,
                closedGrhIndex: 100,
            },
            TEST_ACCOUNT_ID,
        );

        expect(await listMapDoors(TEST_MAP_NUM, true)).toEqual([
            expect.objectContaining({
                x: 80,
                y: 80,
                isOpen: false,
                blocked: true,
                status: "draft",
            }),
        ]);

        await publishMap(TEST_MAP_NUM, TEST_ACCOUNT_ID);
        expect(await listMapDoors(TEST_MAP_NUM, false)).toEqual([
            expect.objectContaining({
                openGrhIndex: 101,
                closedGrhIndex: 100,
                isOpen: false,
                blocked: true,
            }),
        ]);
    });

    it("rolls back every structure tile when one collides with a door", async () => {
        await expect(
            placeStructure(
                {
                    mapNum: TEST_MAP_NUM,
                    originX: 79,
                    originY: 80,
                    tiles: [
                        {
                            offsetX: 0,
                            offsetY: 0,
                            layer: 4,
                            grhIndex: 500,
                            blocked: false,
                        },
                        {
                            offsetX: 1,
                            offsetY: 0,
                            layer: 3,
                            grhIndex: 501,
                            blocked: true,
                        },
                    ],
                },
                TEST_ACCOUNT_ID,
            ),
        ).rejects.toThrow("colisiona con una puerta");

        const result = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count
             FROM game_map_tile_overrides
             WHERE map_num = $1 AND x = 79 AND y = 80`,
            [TEST_MAP_NUM],
        );
        expect(Number(result.rows[0]?.count ?? 0)).toBe(0);
    });
});
