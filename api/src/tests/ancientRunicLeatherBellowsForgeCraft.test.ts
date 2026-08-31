import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherBellowsForgeCraftEngine,
    ActiveBellowsBench,
} from "../lib/ancientRunicLeatherBellowsForgeCraft";

describe("AncientRunicLeatherBellowsForgeCraftEngine Bellows Framing Benches & Blast Forge Engines", () => {
    it("crafts Celestial Void Seraphic Pneumatic Forge Engine in Blast Sanctum achieving 100% pressure and returns spliced leathers", () => {
        const bench = AncientRunicLeatherBellowsForgeCraftEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_BLAST_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_BLAST_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_PNEUMATIC_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_PNEUMATIC_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_PNEUMATIC_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(
            bench,
            "CELESTIAL_VOID_SERAPHIC_PNEUMATIC_FORGE_ENGINE",
            initialLeathers,
            0.1, // Success roll
            1.0, // Pressure roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bellows?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_PNEUMATIC_FORGE_ENGINE");
        expect(craftRes.bellows?.blastPressurePercent).toBe(100);
        expect(craftRes.bellows?.finalSmeltingSpeedPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.bellows?.finalIngotYieldPurityPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.bellows?.consumedLeatherCount).toBe(2);
        expect(craftRes.bellows?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_PNEUMATIC_LEATHER");
        expect(craftRes.bellows?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range pressure roll and sub-100% quality scaling on Oak framing bench", () => {
        const bench = AncientRunicLeatherBellowsForgeCraftEngine.constructBench("leather_mid", "OAK_BELLOWS_FRAMING_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safePressureRoll = 0.5 -> 0.5 * 40 = 20
        // pressureScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalSpeed = Math.round(20 * 0.936) = 19
        // finalPurity = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(
            bench,
            "APPRENTICE_FORGE_BREEZE_BELLOWS",
            ["TANNED_OXHIDE_BELLOWS_DIAPHRAGM", "TANNED_OXHIDE_BELLOWS_DIAPHRAGM"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bellows?.blastPressurePercent).toBe(34);
        expect(craftRes.bellows?.finalSmeltingSpeedPercent).toBe(19);
        expect(craftRes.bellows?.finalIngotYieldPurityPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherBellowsForgeCraftEngine.constructBench("leather_wear", "OAK_BELLOWS_FRAMING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(
            bench,
            "APPRENTICE_FORGE_BREEZE_BELLOWS",
            ["TANNED_OXHIDE_BELLOWS_DIAPHRAGM", "TANNED_OXHIDE_BELLOWS_DIAPHRAGM"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(
            bench,
            "APPRENTICE_FORGE_BREEZE_BELLOWS",
            ["TANNED_OXHIDE_BELLOWS_DIAPHRAGM", "TANNED_OXHIDE_BELLOWS_DIAPHRAGM"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("jammed or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherBellowsForgeCraftEngine.constructBench("leather_02", "OAK_BELLOWS_FRAMING_BENCH");

        const failRes = AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(
            bench,
            "MASTER_CRUCIBLE_AIR_BLAST_BELLOWS",
            ["CAST_BRASS_BLAST_TUYERE_NOZZLE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient bellows leather");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles diaphragm torn failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherBellowsForgeCraftEngine.constructBench("leather_03", "OAK_BELLOWS_FRAMING_BENCH"); // 85% success

        const fail = AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(
            bench,
            "APPRENTICE_FORGE_BREEZE_BELLOWS",
            ["TANNED_OXHIDE_BELLOWS_DIAPHRAGM", "TANNED_OXHIDE_BELLOWS_DIAPHRAGM", "TANNED_OXHIDE_BELLOWS_DIAPHRAGM"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("torn");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicLeatherBellowsForgeCraftEngine.constructBench("leather_04", "OAK_BELLOWS_FRAMING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherBellowsForgeCraftEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherBellowsForgeCraftEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherBellowsForgeCraftEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported bellows bench type"
        );

        const invalidBench: ActiveBellowsBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(invalidBench, "APPRENTICE_FORGE_BREEZE_BELLOWS", ["TANNED_OXHIDE_BELLOWS_DIAPHRAGM", "TANNED_OXHIDE_BELLOWS_DIAPHRAGM"]).success).toBe(false);
        expect(AncientRunicLeatherBellowsForgeCraftEngine.craftBellows(null as any, "APPRENTICE_FORGE_BREEZE_BELLOWS", []).success).toBe(false);
        expect(AncientRunicLeatherBellowsForgeCraftEngine.maintainBench(null as any).success).toBe(false);
    });
});