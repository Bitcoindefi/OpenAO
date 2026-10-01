import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassEngravingLatheEngine,
    ActiveEngravingLathe,
} from "../lib/ancientRunicGlassEngravingLathe.js";

describe("AncientRunicGlassEngravingLatheEngine Engraving Lathes & Crystal Glassware", () => {
    it("engraves Celestial Void Reliquary Flacon in Sigil Sanctum achieving 100% resonance and returns spliced flacons", () => {
        const lathe = AncientRunicGlassEngravingLatheEngine.constructLathe("engraver_01", "CELESTIAL_VOID_SIGIL_SANCTUM");
        expect(lathe.latheType).toBe("CELESTIAL_VOID_SIGIL_SANCTUM");
        expect(lathe.currentDurability).toBe(310);

        const initialBlanks = [
            "CELESTIAL_VOID_STARLIGHT_FLACON",
            "CELESTIAL_VOID_STARLIGHT_FLACON",
            "CELESTIAL_VOID_STARLIGHT_FLACON"
        ] as any[];

        const craftRes = AncientRunicGlassEngravingLatheEngine.engraveGlassware(
            lathe,
            "CELESTIAL_VOID_RELIQUARY_FLACON",
            initialBlanks,
            0.1, // Success roll
            1.0, // Resonance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.glassware?.recipeType).toBe("CELESTIAL_VOID_RELIQUARY_FLACON");
        expect(craftRes.glassware?.runicResonancePercent).toBe(100);
        expect(craftRes.glassware?.finalSpellEmpowerPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.glassware?.finalManaConservationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.glassware?.consumedBlankCount).toBe(2);
        expect(craftRes.glassware?.consumedBlankType).toBe("CELESTIAL_VOID_STARLIGHT_FLACON");
        expect(craftRes.glassware?.remainingProvidedBlanks.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range resonance roll and sub-100% quality scaling on Cedar lathe", () => {
        const lathe = AncientRunicGlassEngravingLatheEngine.constructLathe("engraver_mid", "CEDAR_GLASS_ENGRAVING_LATHE");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeResonanceRoll = 0.5 -> 0.5 * 40 = 20
        // resonanceScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalEmpower = Math.round(20 * 0.936) = 19
        // finalConservation = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicGlassEngravingLatheEngine.engraveGlassware(
            lathe,
            "CHALICE_OF_SOVEREIGN_VITALITY",
            ["QUARTZ_CRYSTAL_GOBLET_BLANK", "QUARTZ_CRYSTAL_GOBLET_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.glassware?.runicResonancePercent).toBe(34);
        expect(craftRes.glassware?.finalSpellEmpowerPercent).toBe(19);
        expect(craftRes.glassware?.finalManaConservationPercent).toBe(9);
    });

    it("handles lathe becoming non-functional after successful craft when durability falls below threshold", () => {
        const lathe = AncientRunicGlassEngravingLatheEngine.constructLathe("engraver_wear", "CEDAR_GLASS_ENGRAVING_LATHE");
        lathe.currentDurability = 15;
        expect(lathe.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassEngravingLatheEngine.engraveGlassware(
            lathe,
            "CHALICE_OF_SOVEREIGN_VITALITY",
            ["QUARTZ_CRYSTAL_GOBLET_BLANK", "QUARTZ_CRYSTAL_GOBLET_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(lathe.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassEngravingLatheEngine.engraveGlassware(
            lathe,
            "CHALICE_OF_SOVEREIGN_VITALITY",
            ["QUARTZ_CRYSTAL_GOBLET_BLANK", "QUARTZ_CRYSTAL_GOBLET_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("misaligned or lacks durability");
        expect(res2.remainingProvidedBlanks.length).toBe(2);
    });

    it("rejects crafting when insufficient blank is provided and returns provided blanks", () => {
        const lathe = AncientRunicGlassEngravingLatheEngine.constructLathe("engraver_02", "CEDAR_GLASS_ENGRAVING_LATHE");

        const failRes = AncientRunicGlassEngravingLatheEngine.engraveGlassware(
            lathe,
            "DECANTER_OF_ARCANE_CLARITY",
            ["LEAD_CRYSTAL_DECANTER_BLANK"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient crystal blank");
        expect(failRes.remainingProvidedBlanks.length).toBe(1);
        expect(lathe.currentDurability).toBe(75);
    });

    it("handles crystal blank fractured failure roll consuming durability and blanks", () => {
        const lathe = AncientRunicGlassEngravingLatheEngine.constructLathe("engraver_03", "CEDAR_GLASS_ENGRAVING_LATHE"); // 85% success

        const fail = AncientRunicGlassEngravingLatheEngine.engraveGlassware(
            lathe,
            "CHALICE_OF_SOVEREIGN_VITALITY",
            ["QUARTZ_CRYSTAL_GOBLET_BLANK", "QUARTZ_CRYSTAL_GOBLET_BLANK", "QUARTZ_CRYSTAL_GOBLET_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("fractured");
        expect(fail.remainingProvidedBlanks?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(lathe.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainLathe based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const lathe = AncientRunicGlassEngravingLatheEngine.constructLathe("engraver_04", "CEDAR_GLASS_ENGRAVING_LATHE");
        lathe.currentDurability = 0;
        lathe.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassEngravingLatheEngine.maintainLathe(lathe, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassEngravingLatheEngine.maintainLathe(lathe, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported lathe models", () => {
        expect(() => AncientRunicGlassEngravingLatheEngine.constructLathe("e", "PLASTIC_LATHE" as any)).toThrow(
            "Unsupported engraving lathe type"
        );

        const invalidLathe: ActiveEngravingLathe = {
            latheId: "bad",
            engraverPlayerId: "p",
            latheType: "LATHE" as any,
            currentDurability: 50,
            maxDurability: 50,
            engravingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassEngravingLatheEngine.engraveGlassware(invalidLathe, "CHALICE_OF_SOVEREIGN_VITALITY", ["QUARTZ_CRYSTAL_GOBLET_BLANK", "QUARTZ_CRYSTAL_GOBLET_BLANK"]).success).toBe(false);
        expect(AncientRunicGlassEngravingLatheEngine.engraveGlassware(null as any, "CHALICE_OF_SOVEREIGN_VITALITY", []).success).toBe(false);
        expect(AncientRunicGlassEngravingLatheEngine.maintainLathe(null as any).success).toBe(false);
    });
});