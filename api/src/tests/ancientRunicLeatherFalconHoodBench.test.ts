import { describe, it, expect } from "vitest";
import { AncientRunicLeatherFalconHoodBenchEngine } from "../lib/ancientRunicLeatherFalconHoodBench";
import type { ActiveFalconHoodBench } from "../lib/ancientRunicLeatherFalconHoodBench";

describe("AncientRunicLeatherFalconHoodBenchEngine Falcon Benches & Raptor Hoods", () => {
    it("crafts Celestial Void Seraphic Horizon-Piercing Apex Blind in Skyhunter Sanctum achieving 100% calming and returns spliced leathers", () => {
        const bench = AncientRunicLeatherFalconHoodBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_SKYHUNTER_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_SKYHUNTER_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_SKYHUNTER_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_SKYHUNTER_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_SKYHUNTER_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherFalconHoodBenchEngine.craftHood(
            bench,
            "CELESTIAL_VOID_SERAPHIC_HORIZON_PIERCING_APEX_BLIND",
            initialLeathers,
            0.1, // Success roll
            1.0, // Calming roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.hood?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_HORIZON_PIERCING_APEX_BLIND");
        expect(craftRes.hood?.plumageCalmingPercent).toBe(100);
        expect(craftRes.hood?.finalRaptorScoutVisionRangeBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.hood?.finalRaptorAgitatedStressMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.hood?.consumedLeatherCount).toBe(2);
        expect(craftRes.hood?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_SKYHUNTER_LEATHER");
        expect(craftRes.hood?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range calming roll and sub-100% quality scaling on Oak falcon hood bench", () => {
        const bench = AncientRunicLeatherFalconHoodBenchEngine.constructBench("leather_mid", "OAK_FALCON_HOOD_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeCalmingRoll = 0.5 -> 0.5 * 40 = 20
        // calmingScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalVisionBonus = Math.round(20 * 0.936) = 19
        // finalStressMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherFalconHoodBenchEngine.craftHood(
            bench,
            "NOVICE_CALMING_BLIND_HOOD",
            ["TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK", "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.hood?.plumageCalmingPercent).toBe(34);
        expect(craftRes.hood?.finalRaptorScoutVisionRangeBonusPercent).toBe(19);
        expect(craftRes.hood?.finalRaptorAgitatedStressMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherFalconHoodBenchEngine.constructBench("leather_wear", "OAK_FALCON_HOOD_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherFalconHoodBenchEngine.craftHood(
            bench,
            "NOVICE_CALMING_BLIND_HOOD",
            ["TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK", "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherFalconHoodBenchEngine.craftHood(
            res1.updatedBench!,
            "NOVICE_CALMING_BLIND_HOOD",
            ["TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK", "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherFalconHoodBenchEngine.constructBench("leather_02", "OAK_FALCON_HOOD_BENCH");

        const failRes = AncientRunicLeatherFalconHoodBenchEngine.craftHood(
            bench,
            "MASTER_FALCONER_PLUMED_CHAPE_HOOD",
            ["GILDED_BRASS_BEAK_CHAPE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient falcon leather/chapes");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles beak chape misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherFalconHoodBenchEngine.constructBench("leather_03", "OAK_FALCON_HOOD_BENCH"); // 85% success

        const fail = AncientRunicLeatherFalconHoodBenchEngine.craftHood(
            bench,
            "NOVICE_CALMING_BLIND_HOOD",
            ["TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK", "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK", "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherFalconHoodBenchEngine.constructBench("leather_04", "OAK_FALCON_HOOD_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherFalconHoodBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherFalconHoodBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherFalconHoodBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported falcon hood bench type"
        );

        const invalidBench: ActiveFalconHoodBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherFalconHoodBenchEngine.craftHood(invalidBench, "NOVICE_CALMING_BLIND_HOOD", ["TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK", "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherFalconHoodBenchEngine.craftHood(null as any, "NOVICE_CALMING_BLIND_HOOD", []).success).toBe(false);
        expect(AncientRunicLeatherFalconHoodBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});