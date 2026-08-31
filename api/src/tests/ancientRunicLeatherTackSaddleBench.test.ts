import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherTackSaddleBenchEngine,
    ActiveSaddleBench,
} from "../lib/ancientRunicLeatherTackSaddleBench";

describe("AncientRunicLeatherTackSaddleBenchEngine Saddle Benches & Mount Harnesses", () => {
    it("crafts Celestial Void Seraphic Pegasi Saddle in Mount Sanctum achieving 100% comfort and returns spliced leathers", () => {
        const bench = AncientRunicLeatherTackSaddleBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_MOUNT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_MOUNT_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_BARDING_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_BARDING_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_BARDING_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(
            bench,
            "CELESTIAL_VOID_SERAPHIC_PEGASI_SADDLE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Comfort roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddle?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_PEGASI_SADDLE");
        expect(craftRes.saddle?.mountComfortPercent).toBe(100);
        expect(craftRes.saddle?.finalMountStaminaConservationPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.saddle?.finalRiderImpactMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.saddle?.consumedTackCount).toBe(2);
        expect(craftRes.saddle?.consumedTackType).toBe("CELESTIAL_VOID_STARLIGHT_BARDING_LEATHER");
        expect(craftRes.saddle?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range comfort roll and sub-100% quality scaling on Oak stitching horse", () => {
        const bench = AncientRunicLeatherTackSaddleBenchEngine.constructBench("leather_mid", "OAK_SADDLE_STITCHING_HORSE");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeComfortRoll = 0.5 -> 0.5 * 40 = 20
        // comfortScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalStamina = Math.round(20 * 0.936) = 19
        // finalImpact = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(
            bench,
            "COURIER_SWIFT_GALLOP_SADDLE",
            ["TANNED_COWHIDE_HARNESS_STRAP", "TANNED_COWHIDE_HARNESS_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddle?.mountComfortPercent).toBe(34);
        expect(craftRes.saddle?.finalMountStaminaConservationPercent).toBe(19);
        expect(craftRes.saddle?.finalRiderImpactMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherTackSaddleBenchEngine.constructBench("leather_wear", "OAK_SADDLE_STITCHING_HORSE");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(
            bench,
            "COURIER_SWIFT_GALLOP_SADDLE",
            ["TANNED_COWHIDE_HARNESS_STRAP", "TANNED_COWHIDE_HARNESS_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(
            bench,
            "COURIER_SWIFT_GALLOP_SADDLE",
            ["TANNED_COWHIDE_HARNESS_STRAP", "TANNED_COWHIDE_HARNESS_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("unstrung or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherTackSaddleBenchEngine.constructBench("leather_02", "OAK_SADDLE_STITCHING_HORSE");

        const failRes = AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(
            bench,
            "KNIGHT_ARMORED_WARHORSE_BARDING",
            ["TEMPERED_STEEL_STIRRUP_RING"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient leather tack");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles strap snapped failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherTackSaddleBenchEngine.constructBench("leather_03", "OAK_SADDLE_STITCHING_HORSE"); // 85% success

        const fail = AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(
            bench,
            "COURIER_SWIFT_GALLOP_SADDLE",
            ["TANNED_COWHIDE_HARNESS_STRAP", "TANNED_COWHIDE_HARNESS_STRAP", "TANNED_COWHIDE_HARNESS_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("snapped");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicLeatherTackSaddleBenchEngine.constructBench("leather_04", "OAK_SADDLE_STITCHING_HORSE");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherTackSaddleBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherTackSaddleBenchEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherTackSaddleBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported saddle bench type"
        );

        const invalidBench: ActiveSaddleBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(invalidBench, "COURIER_SWIFT_GALLOP_SADDLE", ["TANNED_COWHIDE_HARNESS_STRAP", "TANNED_COWHIDE_HARNESS_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherTackSaddleBenchEngine.craftSaddle(null as any, "COURIER_SWIFT_GALLOP_SADDLE", []).success).toBe(false);
        expect(AncientRunicLeatherTackSaddleBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});