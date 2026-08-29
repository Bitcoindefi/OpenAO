import { describe, it, expect } from "vitest";
import {
    AncientRunicAstrolabeCelestialNavigationEngine,
    ActiveAstrolabe,
} from "../lib/ancientRunicAstrolabeCelestialNavigation.js";

describe("AncientRunicAstrolabeCelestialNavigationEngine Astrolabes & Star Charts", () => {
    it("crafts Solar Meridian Astrolabe and aligns The Great Dragon Constellation within +-5 deg tolerance", () => {
        const astrolabe = AncientRunicAstrolabeCelestialNavigationEngine.craftAstrolabe("navigator_01", "SOLAR_MERIDIAN_ASTROLABE", 100000);
        expect(astrolabe.astrolabeType).toBe("SOLAR_MERIDIAN_ASTROLABE");
        expect(astrolabe.currentStarlightCharge).toBe(100);

        // Great Dragon: RA=45 deg, Dec=30 deg. Input RA=47 deg, Dec=32 deg (within tolerance)
        const alignRes = AncientRunicAstrolabeCelestialNavigationEngine.alignConstellation(
            astrolabe,
            "THE_GREAT_DRAGON_CONSTELLATION",
            47,
            32,
            100000
        );

        expect(alignRes.success).toBe(true);
        expect(alignRes.starChart?.buffEffect).toBe("DRAGON_SPEED_SURGE_30");
        expect(alignRes.starChart?.durationSeconds).toBe(300);
        expect(alignRes.remainingCharges).toBe(80); // 100 - 20
        expect(astrolabe.currentStarlightCharge).toBe(80);
    });

    it("rejects alignment when right ascension or declination exceeds tolerance", () => {
        const astrolabe = AncientRunicAstrolabeCelestialNavigationEngine.craftAstrolabe("nav_02", "LUNAR_HORIZON_ASTROLABE", 100000);

        // Titan Hammer: RA=120 deg, Dec=60 deg. Input RA=150 deg (misaligned)
        const misaligned = AncientRunicAstrolabeCelestialNavigationEngine.alignConstellation(
            astrolabe,
            "THE_TITAN_HAMMER_CONSTELLATION",
            150,
            60,
            100000
        );

        expect(misaligned.success).toBe(false);
        expect(misaligned.reason).toContain("Constellation misaligned");
        expect(astrolabe.currentStarlightCharge).toBe(80); // No charges consumed on failure
    });

    it("rejects out-of-bounds celestial coordinates explicitly without consuming charges", () => {
        const astrolabe = AncientRunicAstrolabeCelestialNavigationEngine.craftAstrolabe("nav_oob", "SOLAR_MERIDIAN_ASTROLABE", 100000);

        // Declination 1000 (out of [-90, 90] bounds)
        const oobRes = AncientRunicAstrolabeCelestialNavigationEngine.alignConstellation(
            astrolabe,
            "THE_GREAT_DRAGON_CONSTELLATION",
            45,
            1000
        );

        expect(oobRes.success).toBe(false);
        expect(oobRes.reason).toContain("Invalid celestial coordinates");
        expect(astrolabe.currentStarlightCharge).toBe(100); // Preserved
    });

    it("rejects alignment when starlight charges are depleted and recharges properly", () => {
        const astrolabe = AncientRunicAstrolabeCelestialNavigationEngine.craftAstrolabe("nav_03", "VOID_ZENITH_ASTROLABE", 100000);
        astrolabe.currentStarlightCharge = 10; // Insufficient for 20 cost

        const failRes = AncientRunicAstrolabeCelestialNavigationEngine.alignConstellation(
            astrolabe,
            "THE_CELESTIAL_PHOENIX_CONSTELLATION",
            270,
            -15
        );
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient starlight charge");

        // Recharge starlight
        const recRes = AncientRunicAstrolabeCelestialNavigationEngine.rechargeStarlight(astrolabe, 50);
        expect(recRes.success).toBe(true);
        expect(astrolabe.currentStarlightCharge).toBe(60);

        // Now alignment succeeds
        const successRes = AncientRunicAstrolabeCelestialNavigationEngine.alignConstellation(
            astrolabe,
            "THE_CELESTIAL_PHOENIX_CONSTELLATION",
            270,
            -15
        );
        expect(successRes.success).toBe(true);
        expect(astrolabe.currentStarlightCharge).toBe(40);
    });

    it("guards against unsupported astrolabe types and unknown constellations", () => {
        expect(() => AncientRunicAstrolabeCelestialNavigationEngine.craftAstrolabe("n", "WOODEN_COMPASS" as any)).toThrow(
            "Unsupported astrolabe type"
        );

        const astrolabe = AncientRunicAstrolabeCelestialNavigationEngine.craftAstrolabe("n", "SOLAR_MERIDIAN_ASTROLABE");
        const badConst = AncientRunicAstrolabeCelestialNavigationEngine.alignConstellation(
            astrolabe,
            "BIG_DIPPER" as any,
            0,
            0
        );
        expect(badConst.success).toBe(false);
        expect(badConst.reason).toContain("Unknown constellation");
    });
});