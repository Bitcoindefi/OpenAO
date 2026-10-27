import { describe, it, expect } from "vitest";
import { AncientRunicLeatherBracerWristBenchEngine } from "../lib/ancientRunicLeatherBracerWristBench";
import type { ActiveBracerBench } from "../lib/ancientRunicLeatherBracerWristBench";

describe("AncientRunicLeatherBracerWristBenchEngine Bracer Benches & Combat Vambraces", () => {
    it("crafts Celestial Void Seraphic Aegis Havoc Bracer in Aegis Sanctum achieving 100% articulation and returns spliced leathers", () => {
        const bench = AncientRunicLeatherBracerWristBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_AEGIS_WRIST_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_AEGIS_WRIST_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_VAMBRACE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_VAMBRACE_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_VAMBRACE_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherBracerWristBenchEngine.craftBracer(
            bench,
            "CELESTIAL_VOID_SERAPHIC_AEGIS_HAVOC_BRACER",
            initialLeathers,
            0.1, // Success roll
            1.0, // Articulation roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bracer?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_AEGIS_HAVOC_BRACER");
        expect(craftRes.bracer?.wristArticulationPercent).toBe(100);
        expect(craftRes.bracer?.finalArcheryDrawSpeedBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.bracer?.finalWristStrainMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.bracer?.consumedLeatherCount).toBe(2);
        expect(craftRes.bracer?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_VAMBRACE_LEATHER");
        expect(craftRes.bracer?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range articulation roll and sub-100% quality scaling on Oak bracer bench", () => {
        const bench = AncientRunicLeatherBracerWristBenchEngine.constructBench("leather_mid", "OAK_BRACER_WRIST_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeArticulationRoll = 0.5 -> 0.5 * 40 = 20
        // articulationScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalDrawSpeed = Math.round(20 * 0.936) = 19
        // finalStrainMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherBracerWristBenchEngine.craftBracer(
            bench,
            "ARCHER_FLEX_PIVOT_WRISTGUARD",
            ["TANNED_HARDENED_BULLHIDE_BRACER_BLANK", "TANNED_HARDENED_BULLHIDE_BRACER_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bracer?.wristArticulationPercent).toBe(34);
        expect(craftRes.bracer?.finalArcheryDrawSpeedBonusPercent).toBe(19);
        expect(craftRes.bracer?.finalWristStrainMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherBracerWristBenchEngine.constructBench("leather_wear", "OAK_BRACER_WRIST_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherBracerWristBenchEngine.craftBracer(
            bench,
            "ARCHER_FLEX_PIVOT_WRISTGUARD",
            ["TANNED_HARDENED_BULLHIDE_BRACER_BLANK", "TANNED_HARDENED_BULLHIDE_BRACER_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherBracerWristBenchEngine.craftBracer(
            res1.updatedBench!,
            "ARCHER_FLEX_PIVOT_WRISTGUARD",
            ["TANNED_HARDENED_BULLHIDE_BRACER_BLANK", "TANNED_HARDENED_BULLHIDE_BRACER_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherBracerWristBenchEngine.constructBench("leather_02", "OAK_BRACER_WRIST_BENCH");

        const failRes = AncientRunicLeatherBracerWristBenchEngine.craftBracer(
            bench,
            "DUELIST_STEEL_REINFORCED_VAMBRACE",
            ["STEEL_RIVETED_BUCKLE_CLAMP"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient bracer leather/rivets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles strap fractured failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherBracerWristBenchEngine.constructBench("leather_03", "OAK_BRACER_WRIST_BENCH"); // 85% success

        const fail = AncientRunicLeatherBracerWristBenchEngine.craftBracer(
            bench,
            "ARCHER_FLEX_PIVOT_WRISTGUARD",
            ["TANNED_HARDENED_BULLHIDE_BRACER_BLANK", "TANNED_HARDENED_BULLHIDE_BRACER_BLANK", "TANNED_HARDENED_BULLHIDE_BRACER_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("fractured");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherBracerWristBenchEngine.constructBench("leather_04", "OAK_BRACER_WRIST_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherBracerWristBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherBracerWristBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherBracerWristBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported bracer bench type"
        );

        const invalidBench: ActiveBracerBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherBracerWristBenchEngine.craftBracer(invalidBench, "ARCHER_FLEX_PIVOT_WRISTGUARD", ["TANNED_HARDENED_BULLHIDE_BRACER_BLANK", "TANNED_HARDENED_BULLHIDE_BRACER_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherBracerWristBenchEngine.craftBracer(null as any, "ARCHER_FLEX_PIVOT_WRISTGUARD", []).success).toBe(false);
        expect(AncientRunicLeatherBracerWristBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});