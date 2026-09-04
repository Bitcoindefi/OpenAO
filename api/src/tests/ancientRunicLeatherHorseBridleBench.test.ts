import { describe, it, expect } from "vitest";
import { AncientRunicLeatherHorseBridleBenchEngine } from "../lib/ancientRunicLeatherHorseBridleBench";
import type { ActiveHorseBridleBench } from "../lib/ancientRunicLeatherHorseBridleBench";

describe("AncientRunicLeatherHorseBridleBenchEngine Equestrian Benches & Warsteed Bridles", () => {
    it("crafts Celestial Void Warsteed Sovereign Headstall in Chariot Sanctum achieving 100% control and returns spliced leathers", () => {
        const bench = AncientRunicLeatherHorseBridleBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_CELESTIAL_CHARIOT_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_CELESTIAL_CHARIOT_SANCTUM");
        expect(bench.currentDurability).toBe(320);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_HEADSTALL_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_HEADSTALL_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_HEADSTALL_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherHorseBridleBenchEngine.craftBridle(
            bench,
            "CELESTIAL_VOID_WARSTEED_SOVEREIGN_HEADSTALL",
            initialLeathers,
            0.1, // Success roll
            1.0, // Control roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bridle?.recipeType).toBe("CELESTIAL_VOID_WARSTEED_SOVEREIGN_HEADSTALL");
        expect(craftRes.bridle?.equineControlPercent).toBe(100);
        expect(craftRes.bridle?.finalSteedTurnResponsivenessBonusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.bridle?.finalSteedPanicTensionMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.bridle?.consumedLeatherCount).toBe(2);
        expect(craftRes.bridle?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_HEADSTALL_LEATHER");
        expect(craftRes.bridle?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(310); // 320 - 10
    });

    it("verifies mid-range control roll and sub-100% quality scaling on Hardwood stable bridle bench", () => {
        const bench = AncientRunicLeatherHorseBridleBenchEngine.constructBench("leather_mid", "HARDWOOD_STABLE_BRIDLE_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeControlRoll = 0.5 -> 0.5 * 40 = 20
        // controlScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalTurnBonus = Math.round(20 * 0.936) = 19
        // finalPanicMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherHorseBridleBenchEngine.craftBridle(
            bench,
            "NOVICE_CAVALRY_SNAFFLE_BRIDLE",
            ["TANNED_WARSTEED_BRIDLE_LEATHER_STRAP", "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.bridle?.equineControlPercent).toBe(34);
        expect(craftRes.bridle?.finalSteedTurnResponsivenessBonusPercent).toBe(19);
        expect(craftRes.bridle?.finalSteedPanicTensionMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherHorseBridleBenchEngine.constructBench("leather_wear", "HARDWOOD_STABLE_BRIDLE_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherHorseBridleBenchEngine.craftBridle(
            bench,
            "NOVICE_CAVALRY_SNAFFLE_BRIDLE",
            ["TANNED_WARSTEED_BRIDLE_LEATHER_STRAP", "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherHorseBridleBenchEngine.craftBridle(
            res1.updatedBench!,
            "NOVICE_CAVALRY_SNAFFLE_BRIDLE",
            ["TANNED_WARSTEED_BRIDLE_LEATHER_STRAP", "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherHorseBridleBenchEngine.constructBench("leather_02", "HARDWOOD_STABLE_BRIDLE_BENCH");

        const failRes = AncientRunicLeatherHorseBridleBenchEngine.craftBridle(
            bench,
            "VETERAN_KNIGHT_MITHRIL_CURB_BRIDLE",
            ["TEMPERED_MITHRIL_BIT_SNAFFLE_SET"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient bridle leather/snaffle sets");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(80);
    });

    it("handles snaffle bit misaligned failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherHorseBridleBenchEngine.constructBench("leather_03", "HARDWOOD_STABLE_BRIDLE_BENCH"); // 85% success

        const fail = AncientRunicLeatherHorseBridleBenchEngine.craftBridle(
            bench,
            "NOVICE_CAVALRY_SNAFFLE_BRIDLE",
            ["TANNED_WARSTEED_BRIDLE_LEATHER_STRAP", "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP", "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("misaligned");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(70); // 80 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherHorseBridleBenchEngine.constructBench("leather_04", "HARDWOOD_STABLE_BRIDLE_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherHorseBridleBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherHorseBridleBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherHorseBridleBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported horse bridle bench type"
        );

        const invalidBench: ActiveHorseBridleBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherHorseBridleBenchEngine.craftBridle(invalidBench, "NOVICE_CAVALRY_SNAFFLE_BRIDLE", ["TANNED_WARSTEED_BRIDLE_LEATHER_STRAP", "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP"]).success).toBe(false);
        expect(AncientRunicLeatherHorseBridleBenchEngine.craftBridle(null as any, "NOVICE_CAVALRY_SNAFFLE_BRIDLE", []).success).toBe(false);
        expect(AncientRunicLeatherHorseBridleBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});