import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherTrophyMountBenchEngine,
    ActiveTrophyBench,
} from "../lib/ancientRunicLeatherTrophyMountBench";

describe("AncientRunicLeatherTrophyMountBenchEngine Trophy Benches & Beast Wall Mounts", () => {
    it("crafts Celestial Void Seraphic Dragon Sovereign Wall Mount in Trophy Sanctum achieving 100% morale and returns spliced leathers", () => {
        const bench = AncientRunicLeatherTrophyMountBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_TROPHY_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_TROPHY_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_TROPHY_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_TROPHY_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_TROPHY_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(
            bench,
            "CELESTIAL_VOID_SERAPHIC_DRAGON_SOVEREIGN_WALL_MOUNT",
            initialLeathers,
            0.1, // Success roll
            1.0, // Morale roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.trophy?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_DRAGON_SOVEREIGN_WALL_MOUNT");
        expect(craftRes.trophy?.moraleInspiringPercent).toBe(100);
        expect(craftRes.trophy?.finalCombatMoraleBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.trophy?.finalRestingStaminaRegenPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.trophy?.consumedLeatherCount).toBe(2);
        expect(craftRes.trophy?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_SOVEREIGN_TROPHY_LEATHER");
        expect(craftRes.trophy?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range morale roll and sub-100% quality scaling on Oak trophy bench", () => {
        const bench = AncientRunicLeatherTrophyMountBenchEngine.constructBench("leather_mid", "OAK_TROPHY_MOUNTING_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeMoraleRoll = 0.5 -> 0.5 * 40 = 20
        // moraleScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalMorale = Math.round(20 * 0.936) = 19
        // finalResting = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(
            bench,
            "HUNTER_DIRE_WOLF_WALL_MOUNT",
            ["TANNED_DIREBEAR_TROPHY_HIDE", "TANNED_DIREBEAR_TROPHY_HIDE"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.trophy?.moraleInspiringPercent).toBe(34);
        expect(craftRes.trophy?.finalCombatMoraleBonusPercent).toBe(19);
        expect(craftRes.trophy?.finalRestingStaminaRegenPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherTrophyMountBenchEngine.constructBench("leather_wear", "OAK_TROPHY_MOUNTING_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(
            bench,
            "HUNTER_DIRE_WOLF_WALL_MOUNT",
            ["TANNED_DIREBEAR_TROPHY_HIDE", "TANNED_DIREBEAR_TROPHY_HIDE"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(
            res1.updatedBench!,
            "HUNTER_DIRE_WOLF_WALL_MOUNT",
            ["TANNED_DIREBEAR_TROPHY_HIDE", "TANNED_DIREBEAR_TROPHY_HIDE"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("fractured or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherTrophyMountBenchEngine.constructBench("leather_02", "OAK_TROPHY_MOUNTING_BENCH");

        const failRes = AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(
            bench,
            "CHAMPION_MANTICORE_HEAD_MOUNT",
            ["CARVED_MAMMOTH_IVORY_PLAQUE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient trophy leather/ivory");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles plaque splintered failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherTrophyMountBenchEngine.constructBench("leather_03", "OAK_TROPHY_MOUNTING_BENCH"); // 85% success

        const fail = AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(
            bench,
            "HUNTER_DIRE_WOLF_WALL_MOUNT",
            ["TANNED_DIREBEAR_TROPHY_HIDE", "TANNED_DIREBEAR_TROPHY_HIDE", "TANNED_DIREBEAR_TROPHY_HIDE"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("splintered");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherTrophyMountBenchEngine.constructBench("leather_04", "OAK_TROPHY_MOUNTING_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherTrophyMountBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherTrophyMountBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherTrophyMountBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported trophy bench type"
        );

        const invalidBench: ActiveTrophyBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(invalidBench, "HUNTER_DIRE_WOLF_WALL_MOUNT", ["TANNED_DIREBEAR_TROPHY_HIDE", "TANNED_DIREBEAR_TROPHY_HIDE"]).success).toBe(false);
        expect(AncientRunicLeatherTrophyMountBenchEngine.craftTrophyMount(null as any, "HUNTER_DIRE_WOLF_WALL_MOUNT", []).success).toBe(false);
        expect(AncientRunicLeatherTrophyMountBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});