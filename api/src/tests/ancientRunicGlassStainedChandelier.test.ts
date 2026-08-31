import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassStainedChandelierEngine,
    ActiveChandelierHoist,
} from "../lib/ancientRunicGlassStainedChandelier";

describe("AncientRunicGlassStainedChandelierEngine Chandelier Hoists & Cathedral Coronas", () => {
    it("assembles Celestial Void Seraphic Cathedral Chandelier in Corona Sanctum achieving 100% radiance and returns spliced cupolas", () => {
        const hoist = AncientRunicGlassStainedChandelierEngine.constructHoist("glazier_01", "CELESTIAL_VOID_CATHEDRAL_CORONA_SANCTUM");
        expect(hoist.hoistType).toBe("CELESTIAL_VOID_CATHEDRAL_CORONA_SANCTUM");
        expect(hoist.currentDurability).toBe(310);

        const initialCupolas = [
            "CELESTIAL_VOID_STARFIRE_CORONA_GLASS",
            "CELESTIAL_VOID_STARFIRE_CORONA_GLASS",
            "CELESTIAL_VOID_STARFIRE_CORONA_GLASS"
        ] as any[];

        const craftRes = AncientRunicGlassStainedChandelierEngine.assembleChandelier(
            hoist,
            "CELESTIAL_VOID_SERAPHIC_CATHEDRAL_CHANDELIER",
            initialCupolas,
            0.1, // Success roll
            1.0, // Radiance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.chandelier?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_CATHEDRAL_CHANDELIER");
        expect(craftRes.chandelier?.illuminanceRadiancePercent).toBe(100);
        expect(craftRes.chandelier?.finalHolyAuraRadiusPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.chandelier?.finalManaRechargeAuraPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.chandelier?.consumedCupolaCount).toBe(2);
        expect(craftRes.chandelier?.consumedCupolaType).toBe("CELESTIAL_VOID_STARFIRE_CORONA_GLASS");
        expect(craftRes.chandelier?.remainingProvidedCupolas.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range radiance roll and sub-100% quality scaling on Cedar hoist", () => {
        const hoist = AncientRunicGlassStainedChandelierEngine.constructHoist("glazier_mid", "CEDAR_CHANDELIER_ASSEMBLY_HOIST");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeRadianceRoll = 0.5 -> 0.5 * 40 = 20
        // radianceScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalRadius = Math.round(20 * 0.936) = 19
        // finalRecharge = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicGlassStainedChandelierEngine.assembleChandelier(
            hoist,
            "SANCTUARY_VESPER_CHANDELIER",
            ["CATHEDRAL_AMBER_GLASS_CUPOLA", "CATHEDRAL_AMBER_GLASS_CUPOLA"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.chandelier?.illuminanceRadiancePercent).toBe(34);
        expect(craftRes.chandelier?.finalHolyAuraRadiusPercent).toBe(19);
        expect(craftRes.chandelier?.finalManaRechargeAuraPercent).toBe(9);
    });

    it("handles hoist becoming non-functional after successful craft when durability falls below threshold", () => {
        const hoist = AncientRunicGlassStainedChandelierEngine.constructHoist("glazier_wear", "CEDAR_CHANDELIER_ASSEMBLY_HOIST");
        hoist.currentDurability = 15;
        expect(hoist.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassStainedChandelierEngine.assembleChandelier(
            hoist,
            "SANCTUARY_VESPER_CHANDELIER",
            ["CATHEDRAL_AMBER_GLASS_CUPOLA", "CATHEDRAL_AMBER_GLASS_CUPOLA"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(hoist.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassStainedChandelierEngine.assembleChandelier(
            hoist,
            "SANCTUARY_VESPER_CHANDELIER",
            ["CATHEDRAL_AMBER_GLASS_CUPOLA", "CATHEDRAL_AMBER_GLASS_CUPOLA"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("jammed or lacks durability");
        expect(res2.remainingProvidedCupolas.length).toBe(2);
    });

    it("rejects crafting when insufficient cupola is provided and returns provided cupolas", () => {
        const hoist = AncientRunicGlassStainedChandelierEngine.constructHoist("glazier_02", "CEDAR_CHANDELIER_ASSEMBLY_HOIST");

        const failRes = AncientRunicGlassStainedChandelierEngine.assembleChandelier(
            hoist,
            "HIGH_ALTAR_IRON_CORONA_CHANDELIER",
            ["FACETED_LEAD_CRYSTAL_PENDANT"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass cupola");
        expect(failRes.remainingProvidedCupolas.length).toBe(1);
        expect(hoist.currentDurability).toBe(75);
    });

    it("handles armature bent failure roll consuming durability and cupolas", () => {
        const hoist = AncientRunicGlassStainedChandelierEngine.constructHoist("glazier_03", "CEDAR_CHANDELIER_ASSEMBLY_HOIST"); // 85% success

        const fail = AncientRunicGlassStainedChandelierEngine.assembleChandelier(
            hoist,
            "SANCTUARY_VESPER_CHANDELIER",
            ["CATHEDRAL_AMBER_GLASS_CUPOLA", "CATHEDRAL_AMBER_GLASS_CUPOLA", "CATHEDRAL_AMBER_GLASS_CUPOLA"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("bent");
        expect(fail.remainingProvidedCupolas?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(hoist.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainHoist based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const hoist = AncientRunicGlassStainedChandelierEngine.constructHoist("glazier_04", "CEDAR_CHANDELIER_ASSEMBLY_HOIST");
        hoist.currentDurability = 0;
        hoist.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassStainedChandelierEngine.maintainHoist(hoist, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassStainedChandelierEngine.maintainHoist(hoist, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported hoist models", () => {
        expect(() => AncientRunicGlassStainedChandelierEngine.constructHoist("g", "PLASTIC_HOIST" as any)).toThrow(
            "Unsupported chandelier hoist type"
        );

        const invalidHoist: ActiveChandelierHoist = {
            hoistId: "bad",
            glazierPlayerId: "p",
            hoistType: "HOIST" as any,
            currentDurability: 50,
            maxDurability: 50,
            glazieryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassStainedChandelierEngine.assembleChandelier(invalidHoist, "SANCTUARY_VESPER_CHANDELIER", ["CATHEDRAL_AMBER_GLASS_CUPOLA", "CATHEDRAL_AMBER_GLASS_CUPOLA"]).success).toBe(false);
        expect(AncientRunicGlassStainedChandelierEngine.assembleChandelier(null as any, "SANCTUARY_VESPER_CHANDELIER", []).success).toBe(false);
        expect(AncientRunicGlassStainedChandelierEngine.maintainHoist(null as any).success).toBe(false);
    });
});