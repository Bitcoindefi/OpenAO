import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassHourglassSandCasterEngine,
    ActiveHourglassStand,
} from "../lib/ancientRunicGlassHourglassSandCaster";

describe("AncientRunicGlassHourglassSandCasterEngine Hourglass Stands & Chronomantic Clepsydras", () => {
    it("casts Celestial Void Chronos Epoch Clepsydra in Flow Sanctum achieving 100% precision and returns spliced bulbs", () => {
        const stand = AncientRunicGlassHourglassSandCasterEngine.constructStand("caster_01", "CELESTIAL_VOID_CHRONOS_FLOW_SANCTUM");
        expect(stand.standType).toBe("CELESTIAL_VOID_CHRONOS_FLOW_SANCTUM");
        expect(stand.currentDurability).toBe(310);

        const initialBulbs = [
            "CELESTIAL_VOID_TEMPORAL_STARDUST_AMPOULE",
            "CELESTIAL_VOID_TEMPORAL_STARDUST_AMPOULE",
            "CELESTIAL_VOID_TEMPORAL_STARDUST_AMPOULE"
        ] as any[];

        const craftRes = AncientRunicGlassHourglassSandCasterEngine.castHourglass(
            stand,
            "CELESTIAL_VOID_CHRONOS_EPOCH_CLEPSYDRA",
            initialBulbs,
            0.1, // Success roll
            1.0, // Precision roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.hourglass?.recipeType).toBe("CELESTIAL_VOID_CHRONOS_EPOCH_CLEPSYDRA");
        expect(craftRes.hourglass?.temporalPrecisionPercent).toBe(100);
        expect(craftRes.hourglass?.finalCooldownReductionPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.hourglass?.finalHasteFlowDurationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.hourglass?.consumedBulbCount).toBe(2);
        expect(craftRes.hourglass?.consumedBulbType).toBe("CELESTIAL_VOID_TEMPORAL_STARDUST_AMPOULE");
        expect(craftRes.hourglass?.remainingProvidedBulbs.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range precision roll and sub-100% quality scaling on Cedar stand", () => {
        const stand = AncientRunicGlassHourglassSandCasterEngine.constructStand("caster_mid", "CEDAR_HOURGLASS_CASTER_STAND");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safePrecisionRoll = 0.5 -> 0.5 * 40 = 20
        // precisionScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalCooldown = Math.round(20 * 0.936) = 19
        // finalHaste = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicGlassHourglassSandCasterEngine.castHourglass(
            stand,
            "WANDERER_CHRONO_TETHER_HOURGLASS",
            ["FUSED_QUARTZ_GLASS_BULB", "FUSED_QUARTZ_GLASS_BULB"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.hourglass?.temporalPrecisionPercent).toBe(34);
        expect(craftRes.hourglass?.finalCooldownReductionPercent).toBe(19);
        expect(craftRes.hourglass?.finalHasteFlowDurationPercent).toBe(9);
    });

    it("handles stand becoming non-functional after successful craft when durability falls below threshold", () => {
        const stand = AncientRunicGlassHourglassSandCasterEngine.constructStand("caster_wear", "CEDAR_HOURGLASS_CASTER_STAND");
        stand.currentDurability = 15;
        expect(stand.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassHourglassSandCasterEngine.castHourglass(
            stand,
            "WANDERER_CHRONO_TETHER_HOURGLASS",
            ["FUSED_QUARTZ_GLASS_BULB", "FUSED_QUARTZ_GLASS_BULB"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(stand.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassHourglassSandCasterEngine.castHourglass(
            stand,
            "WANDERER_CHRONO_TETHER_HOURGLASS",
            ["FUSED_QUARTZ_GLASS_BULB", "FUSED_QUARTZ_GLASS_BULB"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("misaligned or lacks durability");
        expect(res2.remainingProvidedBulbs.length).toBe(2);
    });

    it("rejects crafting when insufficient bulb is provided and returns provided bulbs", () => {
        const stand = AncientRunicGlassHourglassSandCasterEngine.constructStand("caster_02", "CEDAR_HOURGLASS_CASTER_STAND");

        const failRes = AncientRunicGlassHourglassSandCasterEngine.castHourglass(
            stand,
            "TIME_WARP_SPELL_HASTE_SANDGLASS",
            ["CHRONOMANTIC_GOLD_SAND_PHIAL"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass bulb");
        expect(failRes.remainingProvidedBulbs.length).toBe(1);
        expect(stand.currentDurability).toBe(75);
    });

    it("handles hourglass cracked failure roll consuming durability and bulbs", () => {
        const stand = AncientRunicGlassHourglassSandCasterEngine.constructStand("caster_03", "CEDAR_HOURGLASS_CASTER_STAND"); // 85% success

        const fail = AncientRunicGlassHourglassSandCasterEngine.castHourglass(
            stand,
            "WANDERER_CHRONO_TETHER_HOURGLASS",
            ["FUSED_QUARTZ_GLASS_BULB", "FUSED_QUARTZ_GLASS_BULB", "FUSED_QUARTZ_GLASS_BULB"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("cracked");
        expect(fail.remainingProvidedBulbs?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(stand.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainStand based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const stand = AncientRunicGlassHourglassSandCasterEngine.constructStand("caster_04", "CEDAR_HOURGLASS_CASTER_STAND");
        stand.currentDurability = 0;
        stand.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassHourglassSandCasterEngine.maintainStand(stand, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassHourglassSandCasterEngine.maintainStand(stand, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported stand models", () => {
        expect(() => AncientRunicGlassHourglassSandCasterEngine.constructStand("c", "PLASTIC_STAND" as any)).toThrow(
            "Unsupported hourglass stand type"
        );

        const invalidStand: ActiveHourglassStand = {
            standId: "bad",
            casterPlayerId: "p",
            standType: "STAND" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicGlassHourglassSandCasterEngine.castHourglass(invalidStand, "WANDERER_CHRONO_TETHER_HOURGLASS", ["FUSED_QUARTZ_GLASS_BULB", "FUSED_QUARTZ_GLASS_BULB"]).success).toBe(false);
        expect(AncientRunicGlassHourglassSandCasterEngine.castHourglass(null as any, "WANDERER_CHRONO_TETHER_HOURGLASS", []).success).toBe(false);
        expect(AncientRunicGlassHourglassSandCasterEngine.maintainStand(null as any).success).toBe(false);
    });
});