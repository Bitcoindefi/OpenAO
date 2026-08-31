import { describe, it, expect } from "vitest";
import {
    AncientRunicCulinaryCookingCauldronEngine,
    ActiveCookingCauldron,
} from "../lib/ancientRunicCulinaryCookingCauldron.js";

describe("AncientRunicCulinaryCookingCauldronEngine Culinary Feasts & Banquets", () => {
    it("cooks Celestial Void Kraken Banquet in Banquet Sanctum achieving 100% satiety and returns spliced fillets", () => {
        const cauldron = AncientRunicCulinaryCookingCauldronEngine.constructCauldron("chef_01", "CELESTIAL_VOID_BANQUET_SANCTUM");
        expect(cauldron.cauldronType).toBe("CELESTIAL_VOID_BANQUET_SANCTUM");
        expect(cauldron.currentDurability).toBe(310);

        const initialMeats = [
            "CELESTIAL_VOID_KRAKEN_FILLET",
            "CELESTIAL_VOID_KRAKEN_FILLET",
            "CELESTIAL_VOID_KRAKEN_FILLET"
        ] as any[];

        const craftRes = AncientRunicCulinaryCookingCauldronEngine.cookFeast(
            cauldron,
            "CELESTIAL_VOID_KRAKEN_BANQUET",
            initialMeats,
            0.1, // Success roll
            1.0, // Satiety roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.feast?.recipeType).toBe("CELESTIAL_VOID_KRAKEN_BANQUET");
        expect(craftRes.feast?.satietyRatingPercent).toBe(100);
        expect(craftRes.feast?.finalSatietyDurationSec).toBe(864); // 720 * 1.20 = 864s
        expect(craftRes.feast?.finalStaminaRegenPerSec).toBe(84); // 70 * 1.20 = 84 SP/s
        expect(craftRes.feast?.consumedMeatCount).toBe(2);
        expect(craftRes.feast?.consumedMeatType).toBe("CELESTIAL_VOID_KRAKEN_FILLET");
        expect(craftRes.feast?.remainingProvidedMeats.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles cauldron becoming non-functional after successful craft when durability falls below threshold", () => {
        const cauldron = AncientRunicCulinaryCookingCauldronEngine.constructCauldron("chef_wear", "CAST_IRON_HEARTH_CAULDRON");
        cauldron.currentDurability = 15;
        expect(cauldron.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicCulinaryCookingCauldronEngine.cookFeast(
            cauldron,
            "RANGER_SUSTENANCE_BROTH",
            ["WILD_BOAR_SHANK", "WILD_BOAR_SHANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(cauldron.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicCulinaryCookingCauldronEngine.cookFeast(
            cauldron,
            "RANGER_SUSTENANCE_BROTH",
            ["WILD_BOAR_SHANK", "WILD_BOAR_SHANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("sooted or lacks durability");
    });

    it("rejects crafting when insufficient meat is provided", () => {
        const cauldron = AncientRunicCulinaryCookingCauldronEngine.constructCauldron("chef_02", "CAST_IRON_HEARTH_CAULDRON");

        const failRes = AncientRunicCulinaryCookingCauldronEngine.cookFeast(
            cauldron,
            "PHOENIXFIRE_BRAISED_STEAK",
            ["FIRECREST_PHOENIX_TENDERLOIN"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient meat");
        expect(cauldron.currentDurability).toBe(75);
    });

    it("handles broth scorched failure roll consuming durability and meats", () => {
        const cauldron = AncientRunicCulinaryCookingCauldronEngine.constructCauldron("chef_03", "CAST_IRON_HEARTH_CAULDRON"); // 85% success

        const fail = AncientRunicCulinaryCookingCauldronEngine.cookFeast(
            cauldron,
            "RANGER_SUSTENANCE_BROTH",
            ["WILD_BOAR_SHANK", "WILD_BOAR_SHANK", "WILD_BOAR_SHANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("scorched");
        expect(fail.remainingProvidedMeats?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(cauldron.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainCauldron based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const cauldron = AncientRunicCulinaryCookingCauldronEngine.constructCauldron("chef_04", "CAST_IRON_HEARTH_CAULDRON");
        cauldron.currentDurability = 0;
        cauldron.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicCulinaryCookingCauldronEngine.maintainCauldron(cauldron, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicCulinaryCookingCauldronEngine.maintainCauldron(cauldron, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported cauldron models", () => {
        expect(() => AncientRunicCulinaryCookingCauldronEngine.constructCauldron("c", "PLASTIC_POT" as any)).toThrow(
            "Unsupported cooking cauldron type"
        );

        const invalidCauldron: ActiveCookingCauldron = {
            cauldronId: "bad",
            chefPlayerId: "p",
            cauldronType: "POT" as any,
            currentDurability: 50,
            maxDurability: 50,
            cookingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicCulinaryCookingCauldronEngine.cookFeast(invalidCauldron, "RANGER_SUSTENANCE_BROTH", ["WILD_BOAR_SHANK", "WILD_BOAR_SHANK"]).success).toBe(false);
        expect(AncientRunicCulinaryCookingCauldronEngine.cookFeast(null as any, "RANGER_SUSTENANCE_BROTH", []).success).toBe(false);
        expect(AncientRunicCulinaryCookingCauldronEngine.maintainCauldron(null as any).success).toBe(false);
    });
});