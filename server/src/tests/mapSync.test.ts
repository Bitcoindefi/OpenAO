import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { applyMapTileOverridesToVars, type MapTileOverride } from "../gameDataSync";

const vars = require("../vars");

describe("Live Map Sync & Hot-Reloading", () => {
    beforeEach(() => {
        vars.mapa = {};
        vars.mapa[1] = {
            10: {
                15: {
                    graphics: { 1: 100 },
                    blocked: 1
                }
            }
        };
    });

    it("should apply graphic layer override on a valid map tile", () => {
        const overrides: MapTileOverride[] = [
            {
                x: 15,
                y: 10,
                layer: 2,
                grhIndex: 500,
                blocked: null,
                status: "published"
            }
        ];

        const applied = applyMapTileOverridesToVars(1, overrides);
        assert.equal(applied, 1);
        assert.deepEqual(vars.mapa[1][10][15].graphics, { 1: 100, 2: 500 });
        assert.equal(vars.mapa[1][10][15].blocked, 1);
    });

    it("should unblock a tile when blocked is false", () => {
        const overrides: MapTileOverride[] = [
            {
                x: 15,
                y: 10,
                layer: 1,
                grhIndex: null,
                blocked: false,
                status: "published"
            }
        ];

        const applied = applyMapTileOverridesToVars(1, overrides);
        assert.equal(applied, 1);
        assert.equal(vars.mapa[1][10][15].blocked, undefined);
    });

    it("should remove a layer graphic when grhIndex is null or 0", () => {
        const overrides: MapTileOverride[] = [
            {
                x: 15,
                y: 10,
                layer: 1,
                grhIndex: 0,
                blocked: null,
                status: "published"
            }
        ];

        const applied = applyMapTileOverridesToVars(1, overrides);
        assert.equal(applied, 1);
        assert.equal(vars.mapa[1][10][15].graphics, undefined);
    });

    it("should gracefully handle uninitialized maps", () => {
        const overrides: MapTileOverride[] = [
            {
                x: 1,
                y: 1,
                layer: 1,
                grhIndex: 123,
                blocked: true,
                status: "published"
            }
        ];

        const applied = applyMapTileOverridesToVars(999, overrides);
        assert.equal(applied, 0);
    });

    it("should revert previously applied overrides when they are deleted or unpublished from DB", () => {
        const initialOverrides: MapTileOverride[] = [
            {
                x: 15,
                y: 10,
                layer: 2,
                grhIndex: 777,
                blocked: true,
                status: "published"
            }
        ];

        applyMapTileOverridesToVars(1, initialOverrides);
        assert.equal(vars.mapa[1][10][15].graphics[2], 777);

        // Subsequent reload with empty overrides (override deleted in DB)
        applyMapTileOverridesToVars(1, []);

        // Graphic at layer 2 must be reverted/deleted, original layer 1 graphic (100) preserved
        assert.deepEqual(vars.mapa[1][10][15].graphics, { 1: 100 });
        assert.equal(vars.mapa[1][10][15].blocked, 1);
    });
});
