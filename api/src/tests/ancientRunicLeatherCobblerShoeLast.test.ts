import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherCobblerShoeLastEngine,
    ActiveCobblerLast,
} from "../lib/ancientRunicLeatherCobblerShoeLast.js";

describe("AncientRunicLeatherCobblerShoeLastEngine Cobbler Lasts & Footwear", () => {
    it("cobbles Celestial Void Seraphic Winged Greave in Swift-Tread Sanctum achieving 100% traction and returns spliced soles", () => {
        const last = AncientRunicLeatherCobblerShoeLastEngine.constructLast("cobbler_01", "CELESTIAL_VOID_SWIFT_TREAD_SANCTUM");
        expect(last.lastType).toBe("CELESTIAL_VOID_SWIFT_TREAD_SANCTUM");
        expect(last.currentDurability).toBe(310);

        const initialSoles = [
            "CELESTIAL_VOID_STARLIGHT_TREAD_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_TREAD_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_TREAD_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(
            last,
            "CELESTIAL_VOID_SERAPHIC_WINGED_GREAVE",
            initialSoles,
            0.1, // Success roll
            1.0, // Traction roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.footwear?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_WINGED_GREAVE");
        expect(craftRes.footwear?.treadTractionPercent).toBe(100);
        expect(craftRes.footwear?.finalMovementSpeedPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.footwear?.finalTerrainFatigueResistancePercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.footwear?.consumedSoleCount).toBe(2);
        expect(craftRes.footwear?.consumedSoleType).toBe("CELESTIAL_VOID_STARLIGHT_TREAD_LEATHER");
        expect(craftRes.footwear?.remainingProvidedSoles.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range traction roll and sub-100% quality scaling on Oak cobbler bench", () => {
        const last = AncientRunicLeatherCobblerShoeLastEngine.constructLast("cobbler_mid", "OAK_COBBLER_LAST_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeTractionRoll = 0.5 -> 0.5 * 40 = 20
        // tractionScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalSpeed = Math.round(20 * 0.936) = 19
        // finalFatigue = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(
            last,
            "SCOUT_SWIFT_STRIDE_MOCCASIN",
            ["TANNED_COWHIDE_SOLE_PLATE", "TANNED_COWHIDE_SOLE_PLATE"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.footwear?.treadTractionPercent).toBe(34);
        expect(craftRes.footwear?.finalMovementSpeedPercent).toBe(19);
        expect(craftRes.footwear?.finalTerrainFatigueResistancePercent).toBe(9);
    });

    it("handles last becoming non-functional after successful craft when durability falls below threshold", () => {
        const last = AncientRunicLeatherCobblerShoeLastEngine.constructLast("cobbler_wear", "OAK_COBBLER_LAST_BENCH");
        last.currentDurability = 15;
        expect(last.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(
            last,
            "SCOUT_SWIFT_STRIDE_MOCCASIN",
            ["TANNED_COWHIDE_SOLE_PLATE", "TANNED_COWHIDE_SOLE_PLATE"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(last.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(
            last,
            "SCOUT_SWIFT_STRIDE_MOCCASIN",
            ["TANNED_COWHIDE_SOLE_PLATE", "TANNED_COWHIDE_SOLE_PLATE"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("split or lacks durability");
        expect(res2.remainingProvidedSoles.length).toBe(2);
    });

    it("rejects crafting when insufficient sole is provided and returns provided soles", () => {
        const last = AncientRunicLeatherCobblerShoeLastEngine.constructLast("cobbler_02", "OAK_COBBLER_LAST_BENCH");

        const failRes = AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(
            last,
            "RANGER_IRON_TREAD_MARCHING_BOOT",
            ["REINFORCED_WYRMHIDE_BOOT_VAMP"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient leather sole");
        expect(failRes.remainingProvidedSoles.length).toBe(1);
        expect(last.currentDurability).toBe(75);
    });

    it("handles sole torn failure roll consuming durability and soles", () => {
        const last = AncientRunicLeatherCobblerShoeLastEngine.constructLast("cobbler_03", "OAK_COBBLER_LAST_BENCH"); // 85% success

        const fail = AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(
            last,
            "SCOUT_SWIFT_STRIDE_MOCCASIN",
            ["TANNED_COWHIDE_SOLE_PLATE", "TANNED_COWHIDE_SOLE_PLATE", "TANNED_COWHIDE_SOLE_PLATE"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("torn");
        expect(fail.remainingProvidedSoles?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(last.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainLast based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const last = AncientRunicLeatherCobblerShoeLastEngine.constructLast("cobbler_04", "OAK_COBBLER_LAST_BENCH");
        last.currentDurability = 0;
        last.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherCobblerShoeLastEngine.maintainLast(last, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherCobblerShoeLastEngine.maintainLast(last, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported last models", () => {
        expect(() => AncientRunicLeatherCobblerShoeLastEngine.constructLast("c", "PLASTIC_LAST" as any)).toThrow(
            "Unsupported cobbler last type"
        );

        const invalidLast: ActiveCobblerLast = {
            lastId: "bad",
            cobblerPlayerId: "p",
            lastType: "LAST" as any,
            currentDurability: 50,
            maxDurability: 50,
            cobblingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(invalidLast, "SCOUT_SWIFT_STRIDE_MOCCASIN", ["TANNED_COWHIDE_SOLE_PLATE", "TANNED_COWHIDE_SOLE_PLATE"]).success).toBe(false);
        expect(AncientRunicLeatherCobblerShoeLastEngine.cobbleFootwear(null as any, "SCOUT_SWIFT_STRIDE_MOCCASIN", []).success).toBe(false);
        expect(AncientRunicLeatherCobblerShoeLastEngine.maintainLast(null as any).success).toBe(false);
    });
});