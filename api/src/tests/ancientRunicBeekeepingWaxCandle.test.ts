import { describe, it, expect } from "vitest";
import {
    AncientRunicBeekeepingWaxCandleEngine,
    ActiveApiaryHive,
} from "../lib/ancientRunicBeekeepingWaxCandle.js";

describe("AncientRunicBeekeepingWaxCandleEngine Apiary & Ritual Candles", () => {
    it("crafts Celestial Beacon of Transcendence in Royal Apiary achieving 100% brilliance and returns spliced combs", () => {
        const hive = AncientRunicBeekeepingWaxCandleEngine.constructHive("beekeeper_01", "CELESTIAL_VOID_ROYAL_APIARY", 100000);
        expect(hive.hiveType).toBe("CELESTIAL_VOID_ROYAL_APIARY");
        expect(hive.currentDurability).toBe(310);

        const initialCombs = [
            "VOID_ROYAL_JELLY_COMB",
            "VOID_ROYAL_JELLY_COMB",
            "VOID_ROYAL_JELLY_COMB"
        ] as any[];

        const craftRes = AncientRunicBeekeepingWaxCandleEngine.craftRitualCandle(
            hive,
            "CELESTIAL_BEACON_OF_TRANSCENDENCE",
            initialCombs,
            0.1, // Success roll
            1.0, // Brilliance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.candle?.recipeType).toBe("CELESTIAL_BEACON_OF_TRANSCENDENCE");
        expect(craftRes.candle?.candleBrilliancePercent).toBe(100);
        expect(craftRes.candle?.finalAuraRadiusMeters).toBe(90); // 75 * 1.20 = 90m
        expect(craftRes.candle?.finalBuffDurationSeconds).toBe(4320); // 3600 * 1.20 = 4320s
        expect(craftRes.candle?.consumedCombCount).toBe(2);
        expect(craftRes.candle?.consumedCombType).toBe("VOID_ROYAL_JELLY_COMB");
        expect(craftRes.candle?.remainingProvidedCombs.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles hive becoming non-functional after successful craft when durability falls below threshold", () => {
        const hive = AncientRunicBeekeepingWaxCandleEngine.constructHive("beekeeper_wear", "WILD_CEDAR_BEEHIVE", 100000);
        hive.currentDurability = 15;
        expect(hive.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const craft1 = AncientRunicBeekeepingWaxCandleEngine.craftRitualCandle(
            hive,
            "VOTIVE_CANDLE_OF_ILLUMINATION",
            ["WILD_BLOSSOM_COMB", "WILD_BLOSSOM_COMB"],
            0.1
        );
        expect(craft1.success).toBe(true);
        expect(craft1.remainingDurability).toBe(5);
        expect(hive.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const craft2 = AncientRunicBeekeepingWaxCandleEngine.craftRitualCandle(
            hive,
            "VOTIVE_CANDLE_OF_ILLUMINATION",
            ["WILD_BLOSSOM_COMB", "WILD_BLOSSOM_COMB"]
        );
        expect(craft2.success).toBe(false);
        expect(craft2.reason).toContain("exhausted or lacks durability");
    });

    it("rejects crafting when insufficient honeycombs are provided", () => {
        const hive = AncientRunicBeekeepingWaxCandleEngine.constructHive("beekeeper_02", "WILD_CEDAR_BEEHIVE", 100000);

        const failRes = AncientRunicBeekeepingWaxCandleEngine.craftRitualCandle(
            hive,
            "WARD_OF_WARDING_GLOW",
            ["ASTRAL_GOLDEN_COMB"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient honeycombs");
        expect(hive.currentDurability).toBe(75);
    });

    it("handles wax scorching failure roll consuming durability", () => {
        const hive = AncientRunicBeekeepingWaxCandleEngine.constructHive("beekeeper_03", "WILD_CEDAR_BEEHIVE", 100000); // 85% success

        const scorch = AncientRunicBeekeepingWaxCandleEngine.craftRitualCandle(
            hive,
            "VOTIVE_CANDLE_OF_ILLUMINATION",
            ["WILD_BLOSSOM_COMB", "WILD_BLOSSOM_COMB"],
            0.95
        );

        expect(scorch.success).toBe(false);
        expect(scorch.reason).toContain("scorched");
        expect(hive.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainHive based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const hive = AncientRunicBeekeepingWaxCandleEngine.constructHive("beekeeper_04", "WILD_CEDAR_BEEHIVE", 100000);
        hive.currentDurability = 0;
        hive.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicBeekeepingWaxCandleEngine.maintainHive(hive, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicBeekeepingWaxCandleEngine.maintainHive(hive, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported hive models", () => {
        expect(() => AncientRunicBeekeepingWaxCandleEngine.constructHive("b", "CARDBOARD_BOX" as any)).toThrow(
            "Unsupported apiary hive type"
        );

        const invalidHive: ActiveApiaryHive = {
            hiveId: "bad",
            beekeeperPlayerId: "p",
            hiveType: "BOX" as any,
            currentDurability: 50,
            maxDurability: 50,
            apiaryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicBeekeepingWaxCandleEngine.craftRitualCandle(invalidHive, "VOTIVE_CANDLE_OF_ILLUMINATION", ["WILD_BLOSSOM_COMB", "WILD_BLOSSOM_COMB"]).success).toBe(false);
        expect(AncientRunicBeekeepingWaxCandleEngine.craftRitualCandle(null as any, "VOTIVE_CANDLE_OF_ILLUMINATION", []).success).toBe(false);
        expect(AncientRunicBeekeepingWaxCandleEngine.maintainHive(null as any).success).toBe(false);
    });
});