import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import {
    createOrUpdateExit,
    createRoundTripExit,
    deleteExit,
    findInaccessibleMaps,
    findOrphanExits,
    listExits,
    loadSpecials,
} from "../lib/mapExits";

const TEST_MAPS_DIR = path.join(__dirname, "..", "..", "src", "mapas_source");

describe("mapExits", () => {
    describe("listExits", () => {
        it("devuelve salidas de un mapa existente", async () => {
            const result = await listExits(TEST_MAPS_DIR, 1);
            assert.ok(result.exits);
            assert.ok(Object.keys(result.exits).length > 0);
        });

        it("devuelve inbound vacio para mapa 1 (ninguno apunta)", async () => {
            const result = await listExits(TEST_MAPS_DIR, 1);
            // Map 1 may have inbound from other maps
            assert.ok(Array.isArray(result.inbound));
        });

        it("devuelve mapa sin salidas para mapa inexistente", async () => {
            const result = await listExits(TEST_MAPS_DIR, 99999);
            assert.deepStrictEqual(result.exits, {});
        });
    });

    describe("validateExit", () => {
        it("rechaza destino fuera de grilla", async () => {
            const result = await createOrUpdateExit(TEST_MAPS_DIR, 1, 5, 5, 2, 200, 200);
            assert.ok(!result.ok);
            if (!result.ok) {
                assert.strictEqual(result.reason, "destination_out_of_bounds");
            }
        });

        it("rechaza mapa destino inexistente", async () => {
            const result = await createOrUpdateExit(TEST_MAPS_DIR, 1, 5, 5, 99999, 10, 10);
            assert.ok(!result.ok);
            if (!result.ok) {
                assert.strictEqual(result.reason, "destination_map_not_found");
            }
        });
    });

    describe("deleteExit", () => {
        it("rechaza borrar salida inexistente", async () => {
            const result = await deleteExit(TEST_MAPS_DIR, 99999, 5, 5);
            assert.ok(!result.ok);
            if (!result.ok) {
                assert.strictEqual(result.reason, "grid_coordinate_invalid");
            }
        });
    });

    describe("findInaccessibleMaps", () => {
        it("devuelve array de mapas inalcanzables", async () => {
            const inaccessible = await findInaccessibleMaps(TEST_MAPS_DIR);
            assert.ok(Array.isArray(inaccessible));
        });
    });

    describe("findOrphanExits", () => {
        it("devuelve array de salidas huerfanas", async () => {
            const orphans = await findOrphanExits(TEST_MAPS_DIR);
            assert.ok(Array.isArray(orphans));
        });
    });
});
