import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Quadtree, AABB, SpatialEntity } from "../lib/spatialQuadtree.js";

describe("Spatial Quadtree Map Optimization & Edge Cases", () => {
    it("handles stacked identical coordinates without stack overflow", () => {
        const boundary = new AABB(50, 50, 50, 50);
        const qt = new Quadtree(boundary);

        // 10 entities on the EXACT same coordinate (25, 25)
        for (let i = 0; i < 10; i++) {
            const inserted = qt.insert({ entityId: `mob_${i}`, x: 25, y: 25 });
            assert.equal(inserted, true);
        }

        const found = qt.queryRange(new AABB(25, 25, 1, 1));
        assert.equal(found.length, 10);
    });

    it("removes moving entities and supports full map clearance", () => {
        const boundary = new AABB(50, 50, 50, 50);
        const qt = new Quadtree(boundary);

        qt.insert({ entityId: "player_1", x: 10, y: 10 });
        assert.equal(qt.queryRange(new AABB(10, 10, 1, 1)).length, 1);

        const removed = qt.remove("player_1");
        assert.equal(removed, true);
        assert.equal(qt.queryRange(new AABB(10, 10, 1, 1)).length, 0);

        qt.insert({ entityId: "mob_a", x: 30, y: 30 });
        qt.clear();
        assert.equal(qt.queryRange(new AABB(50, 50, 50, 50)).length, 0);
    });
});