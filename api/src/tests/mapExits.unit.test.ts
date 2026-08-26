import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
    getMapExits,
    upsertMapExit,
    deleteMapExit,
    upsertExitSchema,
} from "../repositories/mapExits";

const MAPS_SOURCE_DIR = path.resolve(__dirname, "../../../server/mapas_source");
const TEST_MAP_1 = 9991;
const TEST_MAP_2 = 9992;
const MAP_1_DIR = path.join(MAPS_SOURCE_DIR, `mapa_${TEST_MAP_1}`);
const MAP_2_DIR = path.join(MAPS_SOURCE_DIR, `mapa_${TEST_MAP_2}`);
const OPERATION_TIMEOUT_MS = 1000;

async function expectOperationToComplete<T>(promise: Promise<T>, operationName: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${operationName} timed out`)), OPERATION_TIMEOUT_MS);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeout) {
            clearTimeout(timeout);
        }
    });
}

describe("Map Exits CRUD & Bidirectional Pairing (OpenAO #10)", () => {
    beforeEach(() => {
        fs.mkdirSync(MAP_1_DIR, { recursive: true });
        fs.mkdirSync(MAP_2_DIR, { recursive: true });
        fs.writeFileSync(
            path.join(MAP_1_DIR, "specials.json"),
            JSON.stringify({ id: TEST_MAP_1, exits: {}, objects: {}, npcs: {}, triggers: {} }),
            "utf8"
        );
        fs.writeFileSync(
            path.join(MAP_2_DIR, "specials.json"),
            JSON.stringify({ id: TEST_MAP_2, exits: {}, objects: {}, npcs: {}, triggers: {} }),
            "utf8"
        );
    });

    afterEach(() => {
        if (fs.existsSync(MAP_1_DIR)) {
            fs.rmSync(MAP_1_DIR, { recursive: true, force: true });
        }
        if (fs.existsSync(MAP_2_DIR)) {
            fs.rmSync(MAP_2_DIR, { recursive: true, force: true });
        }
    });

    it("should validate exit schemas correctly with zod", () => {
        const valid = upsertExitSchema.safeParse({
            destMap: 5,
            destX: 20,
            destY: 30,
            createPaired: true,
        });
        expect(valid.success).toBe(true);

        const invalidCoordinates = upsertExitSchema.safeParse({
            destMap: 5,
            destX: 150, // out of 1-100 range
            destY: -1,
        });
        expect(invalidCoordinates.success).toBe(false);
    });

    it("should insert a single exit without paired return exit", async () => {
        const result = await upsertMapExit(TEST_MAP_1, 10, 15, {
            destMap: TEST_MAP_2,
            destX: 50,
            destY: 50,
            createPaired: false,
        });

        expect(result.pairedExitCreated).toBe(false);
        expect(result.exit).toEqual({ map: TEST_MAP_2, x: 50, y: 50 });

        const map1Exits = await getMapExits(TEST_MAP_1);
        expect(map1Exits.exits["10,15"]).toEqual({ map: TEST_MAP_2, x: 50, y: 50 });

        const map2Exits = await getMapExits(TEST_MAP_2);
        expect(map2Exits.exits["50,50"]).toBeUndefined();
    });

    it("should insert a bidirectional paired exit on both source and destination maps", async () => {
        const result = await upsertMapExit(TEST_MAP_1, 10, 15, {
            destMap: TEST_MAP_2,
            destX: 25,
            destY: 35,
            createPaired: true,
        });

        expect(result.pairedExitCreated).toBe(true);

        const map1Exits = await getMapExits(TEST_MAP_1);
        expect(map1Exits.exits["10,15"]).toEqual({ map: TEST_MAP_2, x: 25, y: 35 });

        const map2Exits = await getMapExits(TEST_MAP_2);
        expect(map2Exits.exits["25,35"]).toEqual({ map: TEST_MAP_1, x: 10, y: 15 });
    });

    it("should insert and delete a same-map paired exit without deadlocking", async () => {
        const result = await expectOperationToComplete(
            upsertMapExit(TEST_MAP_1, 12, 13, {
                destMap: TEST_MAP_1,
                destX: 14,
                destY: 15,
                createPaired: true,
            }),
            "same-map paired exit creation",
        );

        expect(result.pairedExitCreated).toBe(true);

        let map1Exits = await getMapExits(TEST_MAP_1);
        expect(map1Exits.exits["12,13"]).toEqual({ map: TEST_MAP_1, x: 14, y: 15 });
        expect(map1Exits.exits["14,15"]).toEqual({ map: TEST_MAP_1, x: 12, y: 13 });

        const deleteResult = await expectOperationToComplete(
            deleteMapExit(TEST_MAP_1, 12, 13, true),
            "same-map paired exit deletion",
        );

        expect(deleteResult.deleted).toBe(true);
        expect(deleteResult.pairedExitDeleted).toBe(true);

        map1Exits = await getMapExits(TEST_MAP_1);
        expect(map1Exits.exits["12,13"]).toBeUndefined();
        expect(map1Exits.exits["14,15"]).toBeUndefined();
    });

    it("should complete opposite-direction paired writes without lock-order deadlocks", async () => {
        await expectOperationToComplete(
            Promise.all([
                upsertMapExit(TEST_MAP_1, 10, 10, {
                    destMap: TEST_MAP_2,
                    destX: 20,
                    destY: 20,
                    createPaired: true,
                }),
                upsertMapExit(TEST_MAP_2, 30, 30, {
                    destMap: TEST_MAP_1,
                    destX: 40,
                    destY: 40,
                    createPaired: true,
                }),
            ]),
            "opposite-direction paired exit writes",
        );

        const map1Exits = await getMapExits(TEST_MAP_1);
        expect(map1Exits.exits["10,10"]).toEqual({ map: TEST_MAP_2, x: 20, y: 20 });
        expect(map1Exits.exits["40,40"]).toEqual({ map: TEST_MAP_2, x: 30, y: 30 });

        const map2Exits = await getMapExits(TEST_MAP_2);
        expect(map2Exits.exits["20,20"]).toEqual({ map: TEST_MAP_1, x: 10, y: 10 });
        expect(map2Exits.exits["30,30"]).toEqual({ map: TEST_MAP_1, x: 40, y: 40 });
    });

    it("should delete an exit and optionally delete its reverse pair", async () => {
        // Create bidirectional pair
        await upsertMapExit(TEST_MAP_1, 5, 5, {
            destMap: TEST_MAP_2,
            destX: 80,
            destY: 80,
            createPaired: true,
        });

        // Delete with deletePaired: true
        const deleteResult = await deleteMapExit(TEST_MAP_1, 5, 5, true);
        expect(deleteResult.deleted).toBe(true);
        expect(deleteResult.pairedExitDeleted).toBe(true);

        const map1Exits = await getMapExits(TEST_MAP_1);
        expect(map1Exits.exits["5,5"]).toBeUndefined();

        const map2Exits = await getMapExits(TEST_MAP_2);
        expect(map2Exits.exits["80,80"]).toBeUndefined();
    });

    it("should safely handle concurrent exit updates without clobbering specials.json", async () => {
        // Execute 5 concurrent upsert operations on different coordinates of the same map
        const tasks = Array.from({ length: 5 }, (_, i) =>
            upsertMapExit(TEST_MAP_1, 10 + i, 20 + i, {
                destMap: TEST_MAP_2,
                destX: 30 + i,
                destY: 40 + i,
                createPaired: false,
            })
        );

        await Promise.all(tasks);

        const map1Exits = await getMapExits(TEST_MAP_1);
        for (let i = 0; i < 5; i++) {
            expect(map1Exits.exits[`${10 + i},${20 + i}`]).toEqual({
                map: TEST_MAP_2,
                x: 30 + i,
                y: 40 + i,
            });
        }
    });
});
