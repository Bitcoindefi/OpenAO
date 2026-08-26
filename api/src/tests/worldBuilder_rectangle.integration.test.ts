import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
    paintRectangleSchema,
    paintRectangle,
    grhIndexSchema,
} from "../repositories/worldBuilder";

describe("World Builder Rectangle Fill & Bounds Enforcement", () => {
    it("validates coordinates within standard Argentum 100x100 grid bounds", () => {
        const valid = paintRectangleSchema.safeParse({
            fromX: 10,
            fromY: 10,
            toX: 20,
            toY: 20,
            layer: 1,
            grhIndex: 5500,
            blocked: false,
        });
        assert.ok(valid.success);

        const outOfBoundsX = paintRectangleSchema.safeParse({
            fromX: 0,
            fromY: 10,
            toX: 20,
            toY: 20,
        });
        assert.equal(outOfBoundsX.success, false);

        const outOfBoundsY = paintRectangleSchema.safeParse({
            fromX: 10,
            fromY: 10,
            toX: 20,
            toY: 101,
        });
        assert.equal(outOfBoundsY.success, false);
    });

    it("rejects graphic indexes in the dead zone (320152..999999)", () => {
        assert.ok(grhIndexSchema.safeParse(0).success);
        assert.ok(grhIndexSchema.safeParse(320151).success);
        assert.ok(grhIndexSchema.safeParse(1000000).success);
        assert.equal(grhIndexSchema.safeParse(400000).success, false);
    });

    it("rejects rectangle operations exceeding 500 tile safety limit", async () => {
        // 30x30 = 900 tiles > 500
        await assert.rejects(
            async () => {
                await paintRectangle(
                    1,
                    {
                        fromX: 10,
                        fromY: 10,
                        toX: 39,
                        toY: 39,
                        layer: 1,
                        grhIndex: 5500,
                        blocked: false,
                    },
                    "00000000-0000-0000-0000-000000000001",
                );
            },
            /supera el limite maximo permitido de 500 tiles/i,
        );
    });
});