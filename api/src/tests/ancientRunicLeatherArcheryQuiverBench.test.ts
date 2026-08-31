import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherArcheryQuiverBenchEngine,
    ActiveQuiverBench,
} from "../lib/ancientRunicLeatherArcheryQuiverBench";

describe("AncientRunicLeatherArcheryQuiverBenchEngine Quiver Benches & Ammunition Separators", () => {
    it("crafts Celestial Void Seraphic Endless Arrow Quiver in Quiver Sanctum achieving 100% fluidity and returns spliced leathers", () => {
        const bench = AncientRunicLeatherArcheryQuiverBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_QUIVER_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_QUIVER_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_AMMUNITION_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_AMMUNITION_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_AMMUNITION_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(
            bench,
            "CELESTIAL_VOID_SERAPHIC_ENDLESS_ARROW_QUIVER",
            initialLeathers,
            0.1, // Success roll
            1.0, // Fluidity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.quiver?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_ENDLESS_ARROW_QUIVER");
        expect(craftRes.quiver?.drawSpeedFluidityPercent).toBe(100);
        expect(craftRes.quiver?.finalRangedAttackSpeedPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.quiver?.finalAmmoRetentionPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.quiver?.consumedLeatherCount).toBe(2);
        expect(craftRes.quiver?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_AMMUNITION_LEATHER");
        expect(craftRes.quiver?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range fluidity roll and sub-100% quality scaling on Oak stitching bench", () => {
        const bench = AncientRunicLeatherArcheryQuiverBenchEngine.constructBench("leather_mid", "OAK_QUIVER_STITCHING_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeFluidityRoll = 0.5 -> 0.5 * 40 = 20
        // fluidityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalSpeed = Math.round(20 * 0.936) = 19
        // finalRetention = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(
            bench,
            "RANGER_SWIFT_DRAW_HIP_QUIVER",
            ["TANNED_DEERSKIN_QUIVER_BODY", "TANNED_DEERSKIN_QUIVER_BODY"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.quiver?.drawSpeedFluidityPercent).toBe(34);
        expect(craftRes.quiver?.finalRangedAttackSpeedPercent).toBe(19);
        expect(craftRes.quiver?.finalAmmoRetentionPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherArcheryQuiverBenchEngine.constructBench("leather_wear", "OAK_QUIVER_STITCHING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(
            bench,
            "RANGER_SWIFT_DRAW_HIP_QUIVER",
            ["TANNED_DEERSKIN_QUIVER_BODY", "TANNED_DEERSKIN_QUIVER_BODY"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(
            res1.updatedBench!,
            "RANGER_SWIFT_DRAW_HIP_QUIVER",
            ["TANNED_DEERSKIN_QUIVER_BODY", "TANNED_DEERSKIN_QUIVER_BODY"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherArcheryQuiverBenchEngine.constructBench("leather_02", "OAK_QUIVER_STITCHING_BENCH");

        const failRes = AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(
            bench,
            "MASTER_SNIPER_BACK_QUIVER",
            ["HARDENED_IRONWOOD_DIVIDER_STIFFENER"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient quiver leather");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles quiver split failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherArcheryQuiverBenchEngine.constructBench("leather_03", "OAK_QUIVER_STITCHING_BENCH"); // 85% success

        const fail = AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(
            bench,
            "RANGER_SWIFT_DRAW_HIP_QUIVER",
            ["TANNED_DEERSKIN_QUIVER_BODY", "TANNED_DEERSKIN_QUIVER_BODY", "TANNED_DEERSKIN_QUIVER_BODY"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("split");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicLeatherArcheryQuiverBenchEngine.constructBench("leather_04", "OAK_QUIVER_STITCHING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherArcheryQuiverBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherArcheryQuiverBenchEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherArcheryQuiverBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported quiver bench type"
        );

        const invalidBench: ActiveQuiverBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(invalidBench, "RANGER_SWIFT_DRAW_HIP_QUIVER", ["TANNED_DEERSKIN_QUIVER_BODY", "TANNED_DEERSKIN_QUIVER_BODY"]).success).toBe(false);
        expect(AncientRunicLeatherArcheryQuiverBenchEngine.craftQuiver(null as any, "RANGER_SWIFT_DRAW_HIP_QUIVER", []).success).toBe(false);
        expect(AncientRunicLeatherArcheryQuiverBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});