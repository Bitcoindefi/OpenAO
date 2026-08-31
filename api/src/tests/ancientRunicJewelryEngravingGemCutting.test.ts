import { describe, it, expect } from "vitest";
import {
    AncientRunicJewelryEngravingGemCuttingEngine,
    ActiveLapidaryWheel,
} from "../lib/ancientRunicJewelryEngravingGemCutting.js";

describe("AncientRunicJewelryEngravingGemCuttingEngine Gem Faceting & Cameos", () => {
    it("cuts Celestial Void Heart Cameo on Void Faceter achieving 100% brilliance and returns spliced gems", () => {
        const wheel = AncientRunicJewelryEngravingGemCuttingEngine.forgeWheel("lapidary_01", "CELESTIAL_VOID_LAPIDARY_FACETER", 100000);
        expect(wheel.wheelType).toBe("CELESTIAL_VOID_LAPIDARY_FACETER");
        expect(wheel.currentDurability).toBe(310);

        const initialGems = [
            "CELESTIAL_VOID_DIAMOND",
            "CELESTIAL_VOID_DIAMOND",
            "CELESTIAL_VOID_DIAMOND"
        ] as any[];

        const craftRes = AncientRunicJewelryEngravingGemCuttingEngine.cutFacetedJewelry(
            wheel,
            "CELESTIAL_VOID_HEART_CAMEO",
            initialGems,
            0.1, // Success roll
            1.0, // Brilliance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.jewelry?.recipeType).toBe("CELESTIAL_VOID_HEART_CAMEO");
        expect(craftRes.jewelry?.gemBrilliancePercent).toBe(100);
        expect(craftRes.jewelry?.finalSpellPower).toBe(312); // 260 * 1.20 = 312
        expect(craftRes.jewelry?.finalCritChancePercent).toBe(34); // 28 * 1.20 = 33.6 -> 34%
        expect(craftRes.jewelry?.consumedGemCount).toBe(2);
        expect(craftRes.jewelry?.consumedGemType).toBe("CELESTIAL_VOID_DIAMOND");
        expect(craftRes.jewelry?.remainingProvidedGems.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles wheel becoming non-functional after successful cut when durability falls below threshold", () => {
        const wheel = AncientRunicJewelryEngravingGemCuttingEngine.forgeWheel("lapidary_wear", "HARDENED_COPPER_LAPIDARY_WHEEL", 100000);
        wheel.currentDurability = 15;
        expect(wheel.isFunctional).toBe(true);

        // First cut succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicJewelryEngravingGemCuttingEngine.cutFacetedJewelry(
            wheel,
            "BRILLIANT_SKY_SAPPHIRE_PENDANT",
            ["ROUGH_SKY_SAPPHIRE", "ROUGH_SKY_SAPPHIRE"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(wheel.isFunctional).toBe(false);

        // Subsequent cut is rejected
        const res2 = AncientRunicJewelryEngravingGemCuttingEngine.cutFacetedJewelry(
            wheel,
            "BRILLIANT_SKY_SAPPHIRE_PENDANT",
            ["ROUGH_SKY_SAPPHIRE", "ROUGH_SKY_SAPPHIRE"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("blunted or lacks durability");
    });

    it("rejects cutting when insufficient gemstones are provided", () => {
        const wheel = AncientRunicJewelryEngravingGemCuttingEngine.forgeWheel("lapidary_02", "HARDENED_COPPER_LAPIDARY_WHEEL", 100000);

        const failRes = AncientRunicJewelryEngravingGemCuttingEngine.cutFacetedJewelry(
            wheel,
            "RADIANT_SUNSTONE_SIGNET",
            ["ROUGH_SUNSTONE_RUBY"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient gemstones");
        expect(wheel.currentDurability).toBe(75);
    });

    it("handles gemstone shattering failure roll consuming durability", () => {
        const wheel = AncientRunicJewelryEngravingGemCuttingEngine.forgeWheel("lapidary_03", "HARDENED_COPPER_LAPIDARY_WHEEL", 100000); // 85% success

        const fail = AncientRunicJewelryEngravingGemCuttingEngine.cutFacetedJewelry(
            wheel,
            "BRILLIANT_SKY_SAPPHIRE_PENDANT",
            ["ROUGH_SKY_SAPPHIRE", "ROUGH_SKY_SAPPHIRE"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("shattered under pressure");
        expect(wheel.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainWheel based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const wheel = AncientRunicJewelryEngravingGemCuttingEngine.forgeWheel("lapidary_04", "HARDENED_COPPER_LAPIDARY_WHEEL", 100000);
        wheel.currentDurability = 0;
        wheel.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicJewelryEngravingGemCuttingEngine.maintainWheel(wheel, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicJewelryEngravingGemCuttingEngine.maintainWheel(wheel, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported wheel models", () => {
        expect(() => AncientRunicJewelryEngravingGemCuttingEngine.forgeWheel("j", "PLASTIC_FILE" as any)).toThrow(
            "Unsupported lapidary wheel type"
        );

        const invalidWheel: ActiveLapidaryWheel = {
            wheelId: "bad",
            lapidaryPlayerId: "p",
            wheelType: "FILE" as any,
            currentDurability: 50,
            maxDurability: 50,
            lapidaryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicJewelryEngravingGemCuttingEngine.cutFacetedJewelry(invalidWheel, "BRILLIANT_SKY_SAPPHIRE_PENDANT", ["ROUGH_SKY_SAPPHIRE", "ROUGH_SKY_SAPPHIRE"]).success).toBe(false);
        expect(AncientRunicJewelryEngravingGemCuttingEngine.cutFacetedJewelry(null as any, "BRILLIANT_SKY_SAPPHIRE_PENDANT", []).success).toBe(false);
        expect(AncientRunicJewelryEngravingGemCuttingEngine.maintainWheel(null as any).success).toBe(false);
    });
});