import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherTackSaddleryEngine,
    ActiveSaddlerBench,
} from "../lib/ancientRunicLeatherTackSaddlery.js";

describe("AncientRunicLeatherTackSaddleryEngine Mount Barding & Saddlery", () => {
    it("crafts Celestial Dragonlord Caparison on Void Station achieving 100% craftsmanship and returns spliced leathers", () => {
        const bench = AncientRunicLeatherTackSaddleryEngine.constructBench("saddler_01", "CELESTIAL_VOID_MOUNT_BARDING_STATION", 100000);
        expect(bench.benchType).toBe("CELESTIAL_VOID_MOUNT_BARDING_STATION");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_DRAGONSCALE_LEATHER",
            "CELESTIAL_DRAGONSCALE_LEATHER",
            "CELESTIAL_DRAGONSCALE_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherTackSaddleryEngine.craftMountTack(
            bench,
            "CELESTIAL_DRAGONLORD_CAPARISON",
            initialLeathers,
            0.1, // Success roll
            1.0, // Craftsmanship roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.tack?.recipeType).toBe("CELESTIAL_DRAGONLORD_CAPARISON");
        expect(craftRes.tack?.craftsmanshipPercent).toBe(100);
        expect(craftRes.tack?.finalMountedSpeedPercent).toBe(144); // 120 * 1.20 = 144%
        expect(craftRes.tack?.finalStaminaDrainReductionPercent).toBe(60); // 50 * 1.20 = 60%
        expect(craftRes.tack?.consumedLeatherCount).toBe(2);
        expect(craftRes.tack?.consumedLeatherType).toBe("CELESTIAL_DRAGONSCALE_LEATHER");
        expect(craftRes.tack?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherTackSaddleryEngine.constructBench("saddler_wear", "OAK_STITCHING_PONY", 100000);
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherTackSaddleryEngine.craftMountTack(
            bench,
            "CAVALRY_COURIER_SADDLE",
            ["SUPPLE_DIREWOLF_LEATHER", "SUPPLE_DIREWOLF_LEATHER"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicLeatherTackSaddleryEngine.craftMountTack(
            bench,
            "CAVALRY_COURIER_SADDLE",
            ["SUPPLE_DIREWOLF_LEATHER", "SUPPLE_DIREWOLF_LEATHER"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("loose or lacks durability");
    });

    it("rejects crafting when insufficient leathers are provided", () => {
        const bench = AncientRunicLeatherTackSaddleryEngine.constructBench("saddler_02", "OAK_STITCHING_PONY", 100000);

        const failRes = AncientRunicLeatherTackSaddleryEngine.craftMountTack(
            bench,
            "ARMORED_WARBEAST_BARDING",
            ["HEAVY_BEHEMOTH_HIDE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient leathers");
        expect(bench.currentDurability).toBe(75);
    });

    it("handles stitching thread snap failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherTackSaddleryEngine.constructBench("saddler_03", "OAK_STITCHING_PONY", 100000); // 85% success

        const fail = AncientRunicLeatherTackSaddleryEngine.craftMountTack(
            bench,
            "CAVALRY_COURIER_SADDLE",
            ["SUPPLE_DIREWOLF_LEATHER", "SUPPLE_DIREWOLF_LEATHER", "SUPPLE_DIREWOLF_LEATHER"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("snapped");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicLeatherTackSaddleryEngine.constructBench("saddler_04", "OAK_STITCHING_PONY", 100000);
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherTackSaddleryEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherTackSaddleryEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherTackSaddleryEngine.constructBench("s", "PLASTIC_STOOL" as any)).toThrow(
            "Unsupported saddler bench type"
        );

        const invalidBench: ActiveSaddlerBench = {
            benchId: "bad",
            saddlerPlayerId: "p",
            benchType: "STOOL" as any,
            currentDurability: 50,
            maxDurability: 50,
            saddleryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherTackSaddleryEngine.craftMountTack(invalidBench, "CAVALRY_COURIER_SADDLE", ["SUPPLE_DIREWOLF_LEATHER", "SUPPLE_DIREWOLF_LEATHER"]).success).toBe(false);
        expect(AncientRunicLeatherTackSaddleryEngine.craftMountTack(null as any, "CAVALRY_COURIER_SADDLE", []).success).toBe(false);
        expect(AncientRunicLeatherTackSaddleryEngine.maintainBench(null as any).success).toBe(false);
    });
});