import { describe, it, expect } from "vitest";
import {
    AncientRunicSiegeBallistaCatapultEngine,
    ActiveSiegeWorkshop,
} from "../lib/ancientRunicSiegeBallistaCatapult.js";

describe("AncientRunicSiegeBallistaCatapultEngine Siege Artillery Engineering", () => {
    it("constructs Celestial Void-Shatter Trebuchet in Heavy Trebuchet Forge achieving 100% precision and returns spliced munitions", () => {
        const workshop = AncientRunicSiegeBallistaCatapultEngine.constructWorkshop("engineer_01", "CELESTIAL_VOID_HEAVY_TREBUCHET_FORGE", 100000);
        expect(workshop.workshopType).toBe("CELESTIAL_VOID_HEAVY_TREBUCHET_FORGE");
        expect(workshop.currentDurability).toBe(310);

        const initialMunitions = [
            "VOID_SINGULARITY_CORE",
            "VOID_SINGULARITY_CORE",
            "VOID_SINGULARITY_CORE"
        ] as any[];

        const constructRes = AncientRunicSiegeBallistaCatapultEngine.constructArtillery(
            workshop,
            "CELESTIAL_VOID_SHATTER_TREBUCHET",
            initialMunitions,
            0.1, // Success roll
            1.0, // Precision roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(constructRes.success).toBe(true);
        expect(constructRes.artillery?.recipeType).toBe("CELESTIAL_VOID_SHATTER_TREBUCHET");
        expect(constructRes.artillery?.destructionPrecisionPercent).toBe(100);
        expect(constructRes.artillery?.finalWallBreachDamage).toBe(7800); // 6500 * 1.20 = 7800
        expect(constructRes.artillery?.finalEffectiveRangeMeters).toBe(1440); // 1200 * 1.20 = 1440m
        expect(constructRes.artillery?.consumedMunitionCount).toBe(2);
        expect(constructRes.artillery?.consumedMunitionType).toBe("VOID_SINGULARITY_CORE");
        expect(constructRes.artillery?.remainingProvidedMunitions.length).toBe(1);
        expect(constructRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles workshop becoming non-functional after successful construction when durability falls below threshold", () => {
        const workshop = AncientRunicSiegeBallistaCatapultEngine.constructWorkshop("engineer_wear", "REINFORCED_TIMBER_RIG", 100000);
        workshop.currentDurability = 15;
        expect(workshop.isFunctional).toBe(true);

        // First construction succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicSiegeBallistaCatapultEngine.constructArtillery(
            workshop,
            "HEAVY_WALLBREAKER_BALLISTA",
            ["IRONBOUND_TIMBER_BEAMS", "IRONBOUND_TIMBER_BEAMS"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(workshop.isFunctional).toBe(false);

        // Subsequent construction is rejected
        const res2 = AncientRunicSiegeBallistaCatapultEngine.constructArtillery(
            workshop,
            "HEAVY_WALLBREAKER_BALLISTA",
            ["IRONBOUND_TIMBER_BEAMS", "IRONBOUND_TIMBER_BEAMS"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("misaligned or lacks durability");
    });

    it("rejects construction when insufficient munitions are provided", () => {
        const workshop = AncientRunicSiegeBallistaCatapultEngine.constructWorkshop("engineer_02", "REINFORCED_TIMBER_RIG", 100000);

        const failRes = AncientRunicSiegeBallistaCatapultEngine.constructArtillery(
            workshop,
            "FIRESTORM_MANGONEL_CATAPULT",
            ["MOLTEN_BRIMSTONE_SHELL"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient munitions");
        expect(workshop.currentDurability).toBe(75);
    });

    it("handles torsion failure roll consuming durability", () => {
        const workshop = AncientRunicSiegeBallistaCatapultEngine.constructWorkshop("engineer_03", "REINFORCED_TIMBER_RIG", 100000); // 85% success

        const fail = AncientRunicSiegeBallistaCatapultEngine.constructArtillery(
            workshop,
            "HEAVY_WALLBREAKER_BALLISTA",
            ["IRONBOUND_TIMBER_BEAMS", "IRONBOUND_TIMBER_BEAMS"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("Assembly failed");
        expect(workshop.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainWorkshop based on DURABILITY_COST_PER_CONSTRUCTION threshold", () => {
        const workshop = AncientRunicSiegeBallistaCatapultEngine.constructWorkshop("engineer_04", "REINFORCED_TIMBER_RIG", 100000);
        workshop.currentDurability = 0;
        workshop.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicSiegeBallistaCatapultEngine.maintainWorkshop(workshop, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicSiegeBallistaCatapultEngine.maintainWorkshop(workshop, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported workshop models", () => {
        expect(() => AncientRunicSiegeBallistaCatapultEngine.constructWorkshop("e", "CARPENTRY_DESK" as any)).toThrow(
            "Unsupported siege workshop type"
        );

        const invalidWorkshop: ActiveSiegeWorkshop = {
            workshopId: "bad",
            engineerPlayerId: "p",
            workshopType: "DESK" as any,
            currentDurability: 50,
            maxDurability: 50,
            engineeringPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicSiegeBallistaCatapultEngine.constructArtillery(invalidWorkshop, "HEAVY_WALLBREAKER_BALLISTA", ["IRONBOUND_TIMBER_BEAMS", "IRONBOUND_TIMBER_BEAMS"]).success).toBe(false);
        expect(AncientRunicSiegeBallistaCatapultEngine.constructArtillery(null as any, "HEAVY_WALLBREAKER_BALLISTA", []).success).toBe(false);
        expect(AncientRunicSiegeBallistaCatapultEngine.maintainWorkshop(null as any).success).toBe(false);
    });
});