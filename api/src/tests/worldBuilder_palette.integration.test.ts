import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
    getGraphicMetadata,
    upsertPaletteEntry,
    UPLOADED_GRAPHIC_INDEX_START,
} from "../repositories/worldBuilder";

describe("World Builder Palette & Graphic Resolution Engine", () => {
    it("resolves original engine graphics metadata seamlessly", async () => {
        const metadata = await getGraphicMetadata(5500);
        assert.ok(metadata, "Metadata should be resolved");
        assert.equal(metadata.grhIndex, 5500);
        assert.equal(metadata.isUploaded, false);
        assert.equal(metadata.width, 32);
        assert.equal(metadata.height, 32);
        assert.equal(metadata.frameCount, 1);
        assert.equal(metadata.url, "/graphics/5500.png");
    });

    it("identifies uploaded graphics starting index above 1,000,000 to prevent collisions", () => {
        assert.equal(UPLOADED_GRAPHIC_INDEX_START, 1000000);
        assert.ok(UPLOADED_GRAPHIC_INDEX_START > 320151, "Must never collide with max original grh 320151");
    });

    it("rejects palette entries referencing out-of-range non-existent graphics", async () => {
        await assert.rejects(
            async () => {
                await upsertPaletteEntry(
                    1,
                    {
                        graphics: [400000], // in dead zone between 320151 and 1000000
                        blocked: true,
                    },
                    "00000000-0000-0000-0000-000000000001",
                );
            },
            /fuera de rango/i,
        );
    });

    it("rejects palette entries referencing non-existent uploaded assets", async () => {
        await assert.rejects(
            async () => {
                await upsertPaletteEntry(
                    1,
                    {
                        graphics: [1999999], // non-existent uploaded ID
                        blocked: false,
                    },
                    "00000000-0000-0000-0000-000000000001",
                );
            },
            /no existe en la base de assets/i,
        );
    });
});