import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    collectBlockedTileChanges,
    findNearestWalkableTile,
    formatMapLiveReloadMessage,
    onlyPublishedOverrides,
    parseMapLiveReloadMessage,
} from "../mapLivePublish";

describe("mapLivePublish helpers (OpenAO #11)", () => {
    it("formats and parses the live-reload console marker", () => {
        const message = formatMapLiveReloadMessage(17, 42);
        assert.equal(message, "[MAP_LIVE_RELOAD] map=17 version=42");
        assert.deepEqual(parseMapLiveReloadMessage(message), { mapNum: 17, version: 42 });
        assert.equal(parseMapLiveReloadMessage("hola mundo"), null);
    });

    it("finds the nearest walkable tile when the player stands on a new wall", () => {
        const blocked = new Set(["50,50", "49,50", "51,50", "50,49"]);
        const result = findNearestWalkableTile({ x: 50, y: 50 }, (x, y) => !blocked.has(`${x},${y}`));
        assert.ok(result);
        assert.equal(blocked.has(`${result!.x},${result!.y}`), false);
        // Closest open neighbor among cardinal BFS is (50,51)
        assert.deepEqual(result, { x: 50, y: 51 });
    });

    it("returns null when no walkable tile exists in radius", () => {
        const result = findNearestWalkableTile(
            { x: 1, y: 1 },
            () => false,
            3,
            2,
        );
        assert.equal(result, null);
    });

    it("strips draft overrides so players never see in-progress edits", () => {
        const filtered = onlyPublishedOverrides([
            { status: "published", x: 1 },
            { status: "draft", x: 2 },
            { x: 3 },
        ]);
        assert.deepEqual(
            filtered.map((row) => row.x),
            [1, 3],
        );
    });

    it("collects blocked tile deltas for client blockMap updates", () => {
        const changes = collectBlockedTileChanges(
            [
                { x: 10, y: 10, layer: 1, grhIndex: 1, blocked: false },
                { x: 11, y: 11, layer: 1, grhIndex: 1, blocked: true },
            ],
            [
                { x: 10, y: 10, layer: 1, grhIndex: 1, blocked: true },
                { x: 12, y: 12, layer: 1, grhIndex: 1, blocked: true },
            ],
        );

        assert.deepEqual(
            changes.sort((a, b) => a.x - b.x),
            [
                { x: 10, y: 10, blocked: true },
                { x: 11, y: 11, blocked: false },
                { x: 12, y: 12, blocked: true },
            ],
        );
    });
});
