import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassblowingAlchemyVialEngine,
    ActiveGlassblowingPipe,
} from "../lib/ancientRunicGlassblowingAlchemyVial.js";

describe("AncientRunicGlassblowingAlchemyVialEngine Glassware Synthesis & Purity", () => {
    it("blows Celestial Ambrosia Phial on Void Crucible Spout achieving 100% purity and returns spliced sand", () => {
        const pipe = AncientRunicGlassblowingAlchemyVialEngine.forgeBlowpipe("artisan_01", "CELESTIAL_VOID_CRUCIBLE_SPOUT", 100000);
        expect(pipe.pipeType).toBe("CELESTIAL_VOID_CRUCIBLE_SPOUT");
        expect(pipe.currentDurability).toBe(300);

        const initialSand = [
            "VOID_DARKGLASS_SAND",
            "VOID_DARKGLASS_SAND",
            "VOID_DARKGLASS_SAND"
        ] as any[];

        const blowRes = AncientRunicGlassblowingAlchemyVialEngine.blowGlassware(
            pipe,
            "CELESTIAL_AMBROSIA_PHIAL",
            initialSand,
            0.1, // Success roll
            1.0, // Purity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(blowRes.success).toBe(true);
        expect(blowRes.glassware?.recipeType).toBe("CELESTIAL_AMBROSIA_PHIAL");
        expect(blowRes.glassware?.glassPurityPercent).toBe(100);
        expect(blowRes.glassware?.finalPotionPotencyBonus).toBe(132); // 110 * 1.20 = 132
        expect(blowRes.glassware?.finalPotionDurationSeconds).toBe(4320); // 3600 * 1.20 = 4320
        expect(blowRes.glassware?.consumedSandCount).toBe(2);
        expect(blowRes.glassware?.consumedSandType).toBe("VOID_DARKGLASS_SAND");
        expect(blowRes.glassware?.remainingProvidedSand.length).toBe(1);
        expect(blowRes.remainingDurability).toBe(290); // 300 - 10
    });

    it("rejects glassblowing when insufficient sand materials are provided", () => {
        const pipe = AncientRunicGlassblowingAlchemyVialEngine.forgeBlowpipe("artisan_02", "IRON_BLOWPIPE", 100000);

        const failRes = AncientRunicGlassblowingAlchemyVialEngine.blowGlassware(
            pipe,
            "DRAGONFIRE_CAULDRON_VIAL",
            ["ASTRAL_SILICA_FLUX"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient materials");
        expect(pipe.currentDurability).toBe(70);
    });

    it("handles glass shattering failure roll consuming durability", () => {
        const pipe = AncientRunicGlassblowingAlchemyVialEngine.forgeBlowpipe("artisan_03", "IRON_BLOWPIPE", 100000); // 85% success

        const shatter = AncientRunicGlassblowingAlchemyVialEngine.blowGlassware(
            pipe,
            "ARCANE_ELIXIR_FLASK",
            ["VOLCANIC_QUARTZ_SAND", "VOLCANIC_QUARTZ_SAND"],
            0.95
        );

        expect(shatter.success).toBe(false);
        expect(shatter.reason).toContain("shattered");
        expect(pipe.currentDurability).toBe(60); // 70 - 10
    });

    it("gates isFunctional in annealBlowpipe based on DURABILITY_COST_PER_BLOW threshold", () => {
        const pipe = AncientRunicGlassblowingAlchemyVialEngine.forgeBlowpipe("artisan_04", "IRON_BLOWPIPE", 100000);
        pipe.currentDurability = 0;
        pipe.isFunctional = false;

        // Repair 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassblowingAlchemyVialEngine.annealBlowpipe(pipe, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Repair 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassblowingAlchemyVialEngine.annealBlowpipe(pipe, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported blowpipe models", () => {
        expect(() => AncientRunicGlassblowingAlchemyVialEngine.forgeBlowpipe("a", "PLASTIC_STRAW" as any)).toThrow(
            "Unsupported glassblowing pipe type"
        );

        const invalidPipe: ActiveGlassblowingPipe = {
            pipeId: "bad",
            artisanPlayerId: "p",
            pipeType: "STRAW" as any,
            currentDurability: 50,
            maxDurability: 50,
            blowingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassblowingAlchemyVialEngine.blowGlassware(invalidPipe, "ARCANE_ELIXIR_FLASK", ["VOLCANIC_QUARTZ_SAND", "VOLCANIC_QUARTZ_SAND"]).success).toBe(false);
        expect(AncientRunicGlassblowingAlchemyVialEngine.blowGlassware(null as any, "ARCANE_ELIXIR_FLASK", []).success).toBe(false);
        expect(AncientRunicGlassblowingAlchemyVialEngine.annealBlowpipe(null as any).success).toBe(false);
    });
});