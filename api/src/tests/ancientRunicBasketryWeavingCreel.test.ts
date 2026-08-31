import { describe, it, expect } from "vitest";
import {
    AncientRunicBasketryWeavingCreelEngine,
    ActiveWeavingFrame,
} from "../lib/ancientRunicBasketryWeavingCreel.js";

describe("AncientRunicBasketryWeavingCreelEngine Woven Creels & Foraging Packs", () => {
    it("crafts Celestial Void Bounty Pack in Loom Sanctum achieving 100% craftsmanship and returns spliced reeds", () => {
        const frame = AncientRunicBasketryWeavingCreelEngine.constructFrame("weaver_01", "CELESTIAL_VOID_LOOM_SANCTUM");
        expect(frame.frameType).toBe("CELESTIAL_VOID_LOOM_SANCTUM");
        expect(frame.currentDurability).toBe(310);

        const initialReeds = [
            "CELESTIAL_VOID_SILK_RUSH",
            "CELESTIAL_VOID_SILK_RUSH",
            "CELESTIAL_VOID_SILK_RUSH"
        ] as any[];

        const craftRes = AncientRunicBasketryWeavingCreelEngine.craftContainer(
            frame,
            "CELESTIAL_VOID_BOUNTY_PACK",
            initialReeds,
            0.1, // Success roll
            1.0, // Craftsmanship roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.container?.recipeType).toBe("CELESTIAL_VOID_BOUNTY_PACK");
        expect(craftRes.container?.craftsmanshipPercent).toBe(100);
        expect(craftRes.container?.finalGatherSlots).toBe(300); // 250 * 1.20 = 300
        expect(craftRes.container?.finalBonusGatherYieldPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.container?.consumedReedCount).toBe(2);
        expect(craftRes.container?.consumedReedType).toBe("CELESTIAL_VOID_SILK_RUSH");
        expect(craftRes.container?.remainingProvidedReeds.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles frame becoming non-functional after successful craft when durability falls below threshold", () => {
        const frame = AncientRunicBasketryWeavingCreelEngine.constructFrame("weaver_wear", "WILLOW_WEAVING_FRAME");
        frame.currentDurability = 15;
        expect(frame.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicBasketryWeavingCreelEngine.craftContainer(
            frame,
            "ANGLER_CATCH_CREEL",
            ["MARSH_WILLOW_OSIER", "MARSH_WILLOW_OSIER"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(frame.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicBasketryWeavingCreelEngine.craftContainer(
            frame,
            "ANGLER_CATCH_CREEL",
            ["MARSH_WILLOW_OSIER", "MARSH_WILLOW_OSIER"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("splintered or lacks durability");
    });

    it("rejects crafting when insufficient reeds are provided", () => {
        const frame = AncientRunicBasketryWeavingCreelEngine.constructFrame("weaver_02", "WILLOW_WEAVING_FRAME");

        const failRes = AncientRunicBasketryWeavingCreelEngine.craftContainer(
            frame,
            "HERBALIST_FORAGING_PANNIER",
            ["SILVER_RIVER_REED"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient reeds");
        expect(frame.currentDurability).toBe(75);
    });

    it("handles reed warp snap failure roll consuming durability and reeds", () => {
        const frame = AncientRunicBasketryWeavingCreelEngine.constructFrame("weaver_03", "WILLOW_WEAVING_FRAME"); // 85% success

        const fail = AncientRunicBasketryWeavingCreelEngine.craftContainer(
            frame,
            "ANGLER_CATCH_CREEL",
            ["MARSH_WILLOW_OSIER", "MARSH_WILLOW_OSIER", "MARSH_WILLOW_OSIER"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("frayed");
        expect(fail.remainingProvidedReeds?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(frame.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainFrame based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const frame = AncientRunicBasketryWeavingCreelEngine.constructFrame("weaver_04", "WILLOW_WEAVING_FRAME");
        frame.currentDurability = 0;
        frame.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicBasketryWeavingCreelEngine.maintainFrame(frame, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicBasketryWeavingCreelEngine.maintainFrame(frame, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported frame models", () => {
        expect(() => AncientRunicBasketryWeavingCreelEngine.constructFrame("w", "PLASTIC_BOX" as any)).toThrow(
            "Unsupported weaving frame type"
        );

        const invalidFrame: ActiveWeavingFrame = {
            frameId: "bad",
            weaverPlayerId: "p",
            frameType: "BOX" as any,
            currentDurability: 50,
            maxDurability: 50,
            weavingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicBasketryWeavingCreelEngine.craftContainer(invalidFrame, "ANGLER_CATCH_CREEL", ["MARSH_WILLOW_OSIER", "MARSH_WILLOW_OSIER"]).success).toBe(false);
        expect(AncientRunicBasketryWeavingCreelEngine.craftContainer(null as any, "ANGLER_CATCH_CREEL", []).success).toBe(false);
        expect(AncientRunicBasketryWeavingCreelEngine.maintainFrame(null as any).success).toBe(false);
    });
});