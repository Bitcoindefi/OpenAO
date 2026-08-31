import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherShieldStrappingBenchEngine,
    ActiveShieldBench,
} from "../lib/ancientRunicLeatherShieldStrappingBench";

describe("AncientRunicLeatherShieldStrappingBenchEngine Shield Benches & Combat Enarmes", () => {
    it("crafts Celestial Void Seraphic Bulwark Harness in Bulwark Sanctum achieving 100% poise recovery and returns spliced leathers", () => {
        const bench = AncientRunicLeatherShieldStrappingBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_BULWARK_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_BULWARK_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_AEGIS_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_AEGIS_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_AEGIS_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(
            bench,
            "CELESTIAL_VOID_SERAPHIC_BULWARK_HARNESS",
            initialLeathers,
            0.1, // Success roll
            1.0, // Poise roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.harness?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_BULWARK_HARNESS");
        expect(craftRes.harness?.poiseRecoveryFluidityPercent).toBe(100);
        expect(craftRes.harness?.finalBlockPoiseRecoveryPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.harness?.finalShieldBreakStaminaMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.harness?.consumedLeatherCount).toBe(2);
        expect(craftRes.harness?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_AEGIS_LEATHER");
        expect(craftRes.harness?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range poise roll and sub-100% quality scaling on Oak strapping bench", () => {
        const bench = AncientRunicLeatherShieldStrappingBenchEngine.constructBench("leather_mid", "OAK_SHIELD_STRAPPING_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safePoiseRoll = 0.5 -> 0.5 * 40 = 20
        // poiseScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalRecovery = Math.round(20 * 0.936) = 19
        // finalMitigation = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(
            bench,
            "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP",
            ["TANNED_BULLHIDE_ENARME_STRAP", "TANNED_BULLHIDE_ENARME_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.harness?.poiseRecoveryFluidityPercent).toBe(34);
        expect(craftRes.harness?.finalBlockPoiseRecoveryPercent).toBe(19);
        expect(craftRes.harness?.finalShieldBreakStaminaMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherShieldStrappingBenchEngine.constructBench("leather_wear", "OAK_SHIELD_STRAPPING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(
            bench,
            "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP",
            ["TANNED_BULLHIDE_ENARME_STRAP", "TANNED_BULLHIDE_ENARME_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(
            res1.updatedBench!,
            "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP",
            ["TANNED_BULLHIDE_ENARME_STRAP", "TANNED_BULLHIDE_ENARME_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("cracked or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherShieldStrappingBenchEngine.constructBench("leather_02", "OAK_SHIELD_STRAPPING_BENCH");

        const failRes = AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(
            bench,
            "GUARDIAN_HEAVY_TOWER_SHIELD_ENARME",
            ["TEMPERED_STEEL_BUCKLE_PLATE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient shield leather");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles enarme severed failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherShieldStrappingBenchEngine.constructBench("leather_03", "OAK_SHIELD_STRAPPING_BENCH"); // 85% success

        const fail = AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(
            bench,
            "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP",
            ["TANNED_BULLHIDE_ENARME_STRAP", "TANNED_BULLHIDE_ENARME_STRAP", "TANNED_BULLHIDE_ENARME_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("severed");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherShieldStrappingBenchEngine.constructBench("leather_04", "OAK_SHIELD_STRAPPING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherShieldStrappingBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherShieldStrappingBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherShieldStrappingBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported shield bench type"
        );

        const invalidBench: ActiveShieldBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(invalidBench, "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP", ["TANNED_BULLHIDE_ENARME_STRAP", "TANNED_BULLHIDE_ENARME_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherShieldStrappingBenchEngine.craftShieldStrap(null as any, "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP", []).success).toBe(false);
        expect(AncientRunicLeatherShieldStrappingBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});