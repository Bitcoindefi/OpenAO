import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassAcidEtchingVatEngine,
    ActiveAcidVat,
} from "../lib/ancientRunicGlassAcidEtchingVat";

describe("AncientRunicGlassAcidEtchingVatEngine Acid Vats & Frosted Glassware", () => {
    it("etches Celestial Void Seraphic Frosted Urn in Hydrofluoric Sanctum achieving 100% opacity and returns spliced vessels", () => {
        const vat = AncientRunicGlassAcidEtchingVatEngine.constructVat("glazier_01", "CELESTIAL_VOID_HYDROFLUORIC_SANCTUM");
        expect(vat.vatType).toBe("CELESTIAL_VOID_HYDROFLUORIC_SANCTUM");
        expect(vat.currentDurability).toBe(310);

        const initialVessels = [
            "CELESTIAL_VOID_STARLIGHT_DECANTER_VESSEL",
            "CELESTIAL_VOID_STARLIGHT_DECANTER_VESSEL",
            "CELESTIAL_VOID_STARLIGHT_DECANTER_VESSEL"
        ] as any[];

        const craftRes = AncientRunicGlassAcidEtchingVatEngine.etchGlassware(
            vat,
            "CELESTIAL_VOID_SERAPHIC_FROSTED_URN",
            initialVessels,
            0.1, // Success roll
            1.0, // Opacity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.glassware?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_FROSTED_URN");
        expect(craftRes.glassware?.frostedOpacityPercent).toBe(100);
        expect(craftRes.glassware?.finalCurseResistancePercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.glassware?.finalManaBarrierShieldingPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.glassware?.consumedVesselCount).toBe(2);
        expect(craftRes.glassware?.consumedVesselType).toBe("CELESTIAL_VOID_STARLIGHT_DECANTER_VESSEL");
        expect(craftRes.glassware?.remainingProvidedVessels.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range opacity roll and sub-100% quality scaling on Cedar vat", () => {
        const vat = AncientRunicGlassAcidEtchingVatEngine.constructVat("glazier_mid", "CEDAR_ACID_ETCHING_VAT");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeOpacityRoll = 0.5 -> 0.5 * 40 = 20
        // opacityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalCurse = Math.round(20 * 0.936) = 19
        // finalBarrier = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicGlassAcidEtchingVatEngine.etchGlassware(
            vat,
            "FROSTED_DECANTER_OF_SPIRIT_WARDING",
            ["LEAD_CRYSTAL_CARAFE_BLANK", "LEAD_CRYSTAL_CARAFE_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.glassware?.frostedOpacityPercent).toBe(34);
        expect(craftRes.glassware?.finalCurseResistancePercent).toBe(19);
        expect(craftRes.glassware?.finalManaBarrierShieldingPercent).toBe(9);
    });

    it("handles vat becoming non-functional after successful craft when durability falls below threshold", () => {
        const vat = AncientRunicGlassAcidEtchingVatEngine.constructVat("glazier_wear", "CEDAR_ACID_ETCHING_VAT");
        vat.currentDurability = 15;
        expect(vat.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassAcidEtchingVatEngine.etchGlassware(
            vat,
            "FROSTED_DECANTER_OF_SPIRIT_WARDING",
            ["LEAD_CRYSTAL_CARAFE_BLANK", "LEAD_CRYSTAL_CARAFE_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(vat.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassAcidEtchingVatEngine.etchGlassware(
            vat,
            "FROSTED_DECANTER_OF_SPIRIT_WARDING",
            ["LEAD_CRYSTAL_CARAFE_BLANK", "LEAD_CRYSTAL_CARAFE_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("neutralized or lacks durability");
        expect(res2.remainingProvidedVessels.length).toBe(2);
    });

    it("rejects crafting when insufficient vessel is provided and returns provided vessels", () => {
        const vat = AncientRunicGlassAcidEtchingVatEngine.constructVat("glazier_02", "CEDAR_ACID_ETCHING_VAT");

        const failRes = AncientRunicGlassAcidEtchingVatEngine.etchGlassware(
            vat,
            "ACID_ETCHED_DRAGON_PHYLACTERY",
            ["BEESWAX_PATTERN_RESIST_SLAB"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient crystal vessel");
        expect(failRes.remainingProvidedVessels.length).toBe(1);
        expect(vat.currentDurability).toBe(75);
    });

    it("handles acid breached resist failure roll consuming durability and vessels", () => {
        const vat = AncientRunicGlassAcidEtchingVatEngine.constructVat("glazier_03", "CEDAR_ACID_ETCHING_VAT"); // 85% success

        const fail = AncientRunicGlassAcidEtchingVatEngine.etchGlassware(
            vat,
            "FROSTED_DECANTER_OF_SPIRIT_WARDING",
            ["LEAD_CRYSTAL_CARAFE_BLANK", "LEAD_CRYSTAL_CARAFE_BLANK", "LEAD_CRYSTAL_CARAFE_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("breached");
        expect(fail.remainingProvidedVessels?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(vat.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainVat based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const vat = AncientRunicGlassAcidEtchingVatEngine.constructVat("glazier_04", "CEDAR_ACID_ETCHING_VAT");
        vat.currentDurability = 0;
        vat.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassAcidEtchingVatEngine.maintainVat(vat, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassAcidEtchingVatEngine.maintainVat(vat, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported vat models", () => {
        expect(() => AncientRunicGlassAcidEtchingVatEngine.constructVat("g", "PLASTIC_VAT" as any)).toThrow(
            "Unsupported acid vat type"
        );

        const invalidVat: ActiveAcidVat = {
            vatId: "bad",
            glazierPlayerId: "p",
            vatType: "VAT" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicGlassAcidEtchingVatEngine.etchGlassware(invalidVat, "FROSTED_DECANTER_OF_SPIRIT_WARDING", ["LEAD_CRYSTAL_CARAFE_BLANK", "LEAD_CRYSTAL_CARAFE_BLANK"]).success).toBe(false);
        expect(AncientRunicGlassAcidEtchingVatEngine.etchGlassware(null as any, "FROSTED_DECANTER_OF_SPIRIT_WARDING", []).success).toBe(false);
        expect(AncientRunicGlassAcidEtchingVatEngine.maintainVat(null as any).success).toBe(false);
    });
});