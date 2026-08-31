import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassMosaicKilnEngine,
    ActiveMosaicKiln,
} from "../lib/ancientRunicGlassMosaicKiln.js";

describe("AncientRunicGlassMosaicKilnEngine Mosaic Kilns & Smalti Murals", () => {
    it("fuses Celestial Void Seraphic Tesserae Dome in Smalti Sanctum achieving 100% vibrancy and returns spliced cakes", () => {
        const kiln = AncientRunicGlassMosaicKilnEngine.constructKiln("mosaicist_01", "CELESTIAL_VOID_SMALTI_SANCTUM");
        expect(kiln.kilnType).toBe("CELESTIAL_VOID_SMALTI_SANCTUM");
        expect(kiln.currentDurability).toBe(310);

        const initialCakes = [
            "CELESTIAL_VOID_OPALESCENT_SMALTI_CAKE",
            "CELESTIAL_VOID_OPALESCENT_SMALTI_CAKE",
            "CELESTIAL_VOID_OPALESCENT_SMALTI_CAKE"
        ] as any[];

        const craftRes = AncientRunicGlassMosaicKilnEngine.fuseMosaic(
            kiln,
            "CELESTIAL_VOID_SERAPHIC_TESSERAE_DOME",
            initialCakes,
            0.1, // Success roll
            1.0, // Vibrancy roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.mosaic?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_TESSERAE_DOME");
        expect(craftRes.mosaic?.lightVibrancyPercent).toBe(100);
        expect(craftRes.mosaic?.finalSanctuaryDefensePercent).toBe(100); // 85 * 1.20 = 102 -> clamped to 100%
        expect(craftRes.mosaic?.finalDevotionRegenAuraPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.mosaic?.consumedCakeCount).toBe(2);
        expect(craftRes.mosaic?.consumedCakeType).toBe("CELESTIAL_VOID_OPALESCENT_SMALTI_CAKE");
        expect(craftRes.mosaic?.remainingProvidedCakes.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles kiln becoming non-functional after successful craft when durability falls below threshold", () => {
        const kiln = AncientRunicGlassMosaicKilnEngine.constructKiln("mosaicist_wear", "CLAY_SMALTI_FUSION_KILN");
        kiln.currentDurability = 15;
        expect(kiln.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassMosaicKilnEngine.fuseMosaic(
            kiln,
            "SANCTUARY_GUARDIAN_MOSAIC",
            ["COBALT_BLUE_SMALTI_CAKE", "COBALT_BLUE_SMALTI_CAKE"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(kiln.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassMosaicKilnEngine.fuseMosaic(
            kiln,
            "SANCTUARY_GUARDIAN_MOSAIC",
            ["COBALT_BLUE_SMALTI_CAKE", "COBALT_BLUE_SMALTI_CAKE"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("unheated or lacks durability");
        expect(res2.remainingProvidedCakes.length).toBe(2);
    });

    it("rejects crafting when insufficient cake is provided and returns provided cakes", () => {
        const kiln = AncientRunicGlassMosaicKilnEngine.constructKiln("mosaicist_02", "CLAY_SMALTI_FUSION_KILN");

        const failRes = AncientRunicGlassMosaicKilnEngine.fuseMosaic(
            kiln,
            "IMPERIAL_PANTOCRATOR_SMALTI_MURAL",
            ["IMPERIAL_GOLD_LEAF_GLASS_SLAB"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass cake");
        expect(failRes.remainingProvidedCakes.length).toBe(1);
        expect(kiln.currentDurability).toBe(75);
    });

    it("handles smalti shattered failure roll consuming durability and glass cakes", () => {
        const kiln = AncientRunicGlassMosaicKilnEngine.constructKiln("mosaicist_03", "CLAY_SMALTI_FUSION_KILN"); // 85% success

        const fail = AncientRunicGlassMosaicKilnEngine.fuseMosaic(
            kiln,
            "SANCTUARY_GUARDIAN_MOSAIC",
            ["COBALT_BLUE_SMALTI_CAKE", "COBALT_BLUE_SMALTI_CAKE", "COBALT_BLUE_SMALTI_CAKE"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("shattered");
        expect(fail.remainingProvidedCakes?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(kiln.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainKiln based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const kiln = AncientRunicGlassMosaicKilnEngine.constructKiln("mosaicist_04", "CLAY_SMALTI_FUSION_KILN");
        kiln.currentDurability = 0;
        kiln.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassMosaicKilnEngine.maintainKiln(kiln, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassMosaicKilnEngine.maintainKiln(kiln, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported kiln models", () => {
        expect(() => AncientRunicGlassMosaicKilnEngine.constructKiln("m", "PLASTIC_KILN" as any)).toThrow(
            "Unsupported mosaic kiln type"
        );

        const invalidKiln: ActiveMosaicKiln = {
            kilnId: "bad",
            mosaicistPlayerId: "p",
            kilnType: "KILN" as any,
            currentDurability: 50,
            maxDurability: 50,
            smaltiPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassMosaicKilnEngine.fuseMosaic(invalidKiln, "SANCTUARY_GUARDIAN_MOSAIC", ["COBALT_BLUE_SMALTI_CAKE", "COBALT_BLUE_SMALTI_CAKE"]).success).toBe(false);
        expect(AncientRunicGlassMosaicKilnEngine.fuseMosaic(null as any, "SANCTUARY_GUARDIAN_MOSAIC", []).success).toBe(false);
        expect(AncientRunicGlassMosaicKilnEngine.maintainKiln(null as any).success).toBe(false);
    });
});