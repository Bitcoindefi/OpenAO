import { describe, it, expect } from "vitest";
import {
    AncientRunicPotionAlchemyBrewingEngine,
    ActiveAlchemyCauldron,
} from "../lib/ancientRunicPotionAlchemyBrewing.js";

describe("AncientRunicPotionAlchemyBrewingEngine Alchemy & Flask Infusion", () => {
    it("heats Celestial Crucible to 240C and brews Potion of Invulnerability with 100% purity (50 base + 50 crucible bonus)", () => {
        const crucible = AncientRunicPotionAlchemyBrewingEngine.constructCauldron("alchemist_01", "CELESTIAL_CRUCIBLE", 20, 100000);
        expect(crucible.cauldronType).toBe("CELESTIAL_CRUCIBLE");
        expect(crucible.maxHeatTemperatureCelsius).toBe(300);

        // Heat to optimal 240C
        const heatRes = AncientRunicPotionAlchemyBrewingEngine.heatCauldron(crucible, 240);
        expect(heatRes.success).toBe(true);
        expect(crucible.currentHeatTemperatureCelsius).toBe(240);

        // Brew Potion of Invulnerability (Void Lotus + Moonpetal)
        const brewRes = AncientRunicPotionAlchemyBrewingEngine.brewPotion(
            crucible,
            "POTION_OF_INVULNERABILITY",
            ["VOID_LOTUS", "MOONPETAL"],
            () => 0.1,
            100000
        );

        expect(brewRes.success).toBe(true);
        expect(brewRes.potionFlask?.potionEffectName).toBe("DIVINE_AEGIS_IMMUNITY");
        expect(brewRes.potionFlask?.purityRatingPercent).toBe(100);
        expect(brewRes.potionFlask?.durationSeconds).toBe(15);
    });

    it("differentiates cauldron purity: Copper Pot yields 60% purity at optimal temp", () => {
        const pot = AncientRunicPotionAlchemyBrewingEngine.constructCauldron("alch_copper", "COPPER_ALCHEMICAL_POT", 20, 100000);
        AncientRunicPotionAlchemyBrewingEngine.heatCauldron(pot, 120);

        const brew = AncientRunicPotionAlchemyBrewingEngine.brewPotion(
            pot,
            "ELIXIR_OF_BERSERK_FURY",
            ["BLOODROOT", "STARSHROOM"],
            () => 0.1
        );

        expect(brew.success).toBe(true);
        expect(brew.potionFlask?.purityRatingPercent).toBe(60); // 50 base + 10 copper bonus
    });

    it("rejects brewing when temperature is outside optimal tolerance range (+-20C)", () => {
        const pot = AncientRunicPotionAlchemyBrewingEngine.constructCauldron("alch_02", "COPPER_ALCHEMICAL_POT", 20, 100000);

        const failBrew = AncientRunicPotionAlchemyBrewingEngine.brewPotion(
            pot,
            "ELIXIR_OF_BERSERK_FURY",
            ["BLOODROOT", "STARSHROOM"],
            () => 0.1
        );

        expect(failBrew.success).toBe(false);
        expect(failBrew.reason).toContain("temperature");
    });

    it("rejects brewing when required alchemical ingredients are missing", () => {
        const alembic = AncientRunicPotionAlchemyBrewingEngine.constructCauldron("alch_03", "OBSIDIAN_DISTILLATION_ALEMBIC", 160, 100000);

        const missingRes = AncientRunicPotionAlchemyBrewingEngine.brewPotion(
            alembic,
            "DRAUGHT_OF_ASTRAL_MANA",
            ["BLOODROOT"],
            () => 0.1
        );

        expect(missingRes.success).toBe(false);
        expect(missingRes.reason).toContain("Missing required alchemical ingredient");
    });

    it("rejects heating beyond cauldron maximum heat capacity", () => {
        const pot = AncientRunicPotionAlchemyBrewingEngine.constructCauldron("alch_04", "COPPER_ALCHEMICAL_POT", 20, 100000);

        const overheat = AncientRunicPotionAlchemyBrewingEngine.heatCauldron(pot, 250);
        expect(overheat.success).toBe(false);
        expect(overheat.reason).toContain("exceeds cauldron maximum capacity");
        expect(pot.currentHeatTemperatureCelsius).toBe(20);
    });

    it("guards against null inputs and unsupported cauldron models", () => {
        expect(() => AncientRunicPotionAlchemyBrewingEngine.constructCauldron("a", "CAMPFIRE_MUG" as any)).toThrow(
            "Unsupported alchemy cauldron type"
        );

        expect(AncientRunicPotionAlchemyBrewingEngine.heatCauldron(null as any, 100).success).toBe(false);
        expect(AncientRunicPotionAlchemyBrewingEngine.brewPotion(null as any, "ELIXIR_OF_BERSERK_FURY", []).success).toBe(false);
    });
});