import crypto from "node:crypto";

/**
 * Ancient Runic Potion Alchemy Brewing, Herb Maceration & Flask Infusion Engine for OpenAO MMORPG.
 * Simulates alchemy cauldrons (Copper Pot, Obsidian Alembic, Celestial Crucible),
 * alchemical herb ingredients (Bloodroot, Moonpetal, Starshroom, Void Lotus),
 * temperature regulation (80C to 280C), recipe crafting, and differentiated flask purity ratings (0% to 100%).
 */

export type AlchemyCauldronType = "COPPER_ALCHEMICAL_POT" | "OBSIDIAN_DISTILLATION_ALEMBIC" | "CELESTIAL_CRUCIBLE";
export type AlchemicalHerbType = "BLOODROOT" | "MOONPETAL" | "STARSHROOM" | "VOID_LOTUS";
export type PotionRecipeType = "ELIXIR_OF_BERSERK_FURY" | "DRAUGHT_OF_ASTRAL_MANA" | "POTION_OF_INVULNERABILITY";

export interface CauldronData {
    cauldronType: AlchemyCauldronType;
    maxHeatTemperatureCelsius: number;
    baseSuccessRatePercent: number; // 0 to 100
    flaskPurityBonusPercent: number;
}

export interface PotionRecipeData {
    recipeType: PotionRecipeType;
    requiredHerbs: AlchemicalHerbType[];
    optimalTemperatureCelsius: number;
    potionEffectName: string;
    basePotionDurationSeconds: number;
}

export interface ActiveAlchemyCauldron {
    cauldronId: string;
    alchemistPlayerId: string;
    cauldronType: AlchemyCauldronType;
    currentHeatTemperatureCelsius: number;
    maxHeatTemperatureCelsius: number;
    isFunctional: boolean;
}

export interface BrewedPotionFlask {
    flaskId: string;
    recipeType: PotionRecipeType;
    potionEffectName: string;
    purityRatingPercent: number; // 0 to 100
    durationSeconds: number;
    brewedEpochMs: number;
}

export const CAULDRON_CATALOG: Record<AlchemyCauldronType, CauldronData> = {
    COPPER_ALCHEMICAL_POT: { cauldronType: "COPPER_ALCHEMICAL_POT", maxHeatTemperatureCelsius: 150, baseSuccessRatePercent: 80, flaskPurityBonusPercent: 10 },
    OBSIDIAN_DISTILLATION_ALEMBIC: { cauldronType: "OBSIDIAN_DISTILLATION_ALEMBIC", maxHeatTemperatureCelsius: 220, baseSuccessRatePercent: 90, flaskPurityBonusPercent: 25 },
    CELESTIAL_CRUCIBLE: { cauldronType: "CELESTIAL_CRUCIBLE", maxHeatTemperatureCelsius: 300, baseSuccessRatePercent: 98, flaskPurityBonusPercent: 50 },
};

export const RECIPE_CATALOG: Record<PotionRecipeType, PotionRecipeData> = {
    ELIXIR_OF_BERSERK_FURY: { recipeType: "ELIXIR_OF_BERSERK_FURY", requiredHerbs: ["BLOODROOT", "STARSHROOM"], optimalTemperatureCelsius: 120, potionEffectName: "BERSERK_ATTACK_POWER_50", basePotionDurationSeconds: 180 },
    DRAUGHT_OF_ASTRAL_MANA: { recipeType: "DRAUGHT_OF_ASTRAL_MANA", requiredHerbs: ["MOONPETAL", "STARSHROOM"], optimalTemperatureCelsius: 160, potionEffectName: "ASTRAL_MANA_SURGE_250", basePotionDurationSeconds: 300 },
    POTION_OF_INVULNERABILITY: { recipeType: "POTION_OF_INVULNERABILITY", requiredHerbs: ["VOID_LOTUS", "MOONPETAL"], optimalTemperatureCelsius: 240, potionEffectName: "DIVINE_AEGIS_IMMUNITY", basePotionDurationSeconds: 15 },
};

export class AncientRunicPotionAlchemyBrewingEngine {
    public static readonly TEMPERATURE_TOLERANCE_CELSIUS = 20;

    /**
     * Constructs and initializes an alchemy cauldron.
     */
    public static constructCauldron(
        alchemistPlayerId: string,
        cauldronType: AlchemyCauldronType,
        initialTempCelsius = 20,
        currentEpochMs = Date.now()
    ): ActiveAlchemyCauldron {
        const data = CAULDRON_CATALOG[cauldronType];
        if (!data) {
            throw new Error(`Unsupported alchemy cauldron type: ${String(cauldronType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            cauldronId: `cauldron_${cauldronType.toLowerCase()}_${uuid}`,
            alchemistPlayerId,
            cauldronType,
            currentHeatTemperatureCelsius: Math.max(0, Math.min(data.maxHeatTemperatureCelsius, Number.isFinite(initialTempCelsius) ? initialTempCelsius : 20)),
            maxHeatTemperatureCelsius: data.maxHeatTemperatureCelsius,
            isFunctional: true,
        };
    }

    /**
     * Regulates cauldron heat temperature.
     */
    public static heatCauldron(
        cauldron: ActiveAlchemyCauldron,
        targetTemperatureCelsius: number
    ): { success: boolean; newTemperatureCelsius: number; reason?: string } {
        if (!cauldron || !cauldron.isFunctional) {
            return { success: false, newTemperatureCelsius: cauldron?.currentHeatTemperatureCelsius ?? 0, reason: "Cauldron is broken or invalid." };
        }

        const temp = Number.isFinite(targetTemperatureCelsius) ? targetTemperatureCelsius : cauldron.currentHeatTemperatureCelsius;
        if (temp > cauldron.maxHeatTemperatureCelsius) {
            return {
                success: false,
                newTemperatureCelsius: cauldron.currentHeatTemperatureCelsius,
                reason: `Target temperature (${temp}C) exceeds cauldron maximum capacity (${cauldron.maxHeatTemperatureCelsius}C).`,
            };
        }

        cauldron.currentHeatTemperatureCelsius = Math.max(0, temp);
        return {
            success: true,
            newTemperatureCelsius: cauldron.currentHeatTemperatureCelsius,
        };
    }

    /**
     * Macerates herbs and brews a potion flask.
     */
    public static brewPotion(
        cauldron: ActiveAlchemyCauldron,
        recipeType: PotionRecipeType,
        providedHerbs: AlchemicalHerbType[],
        rng: () => number = Math.random,
        currentEpochMs = Date.now()
    ): { success: boolean; potionFlask?: BrewedPotionFlask; reason?: string } {
        if (!cauldron || !cauldron.isFunctional) {
            return { success: false, reason: "Cauldron is non-functional or invalid." };
        }

        const recipe = RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, reason: `Unknown potion recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedHerbs)) {
            return { success: false, reason: "Invalid ingredients array." };
        }

        // Check required herbs
        for (const req of recipe.requiredHerbs) {
            if (!providedHerbs.includes(req)) {
                return { success: false, reason: `Missing required alchemical ingredient: ${req}` };
            }
        }

        // Check temperature stability
        const tempDiff = Math.abs(cauldron.currentHeatTemperatureCelsius - recipe.optimalTemperatureCelsius);
        if (tempDiff > this.TEMPERATURE_TOLERANCE_CELSIUS) {
            return {
                success: false,
                reason: `Cauldron temperature (${cauldron.currentHeatTemperatureCelsius}C) deviates too far from optimal (${recipe.optimalTemperatureCelsius}C +- ${this.TEMPERATURE_TOLERANCE_CELSIUS}C).`,
            };
        }

        const cauldronData = CAULDRON_CATALOG[cauldron.cauldronType];
        const roll = rng() * 100;
        if (roll > cauldronData.baseSuccessRatePercent) {
            return { success: false, reason: `Alchemy brewing ruined: rolled ${roll.toFixed(1)}, needed <= ${cauldronData.baseSuccessRatePercent}.` };
        }

        // Calculate flask purity (base 50 - tempDiff * 2 + cauldron flask purity bonus)
        const basePurity = Math.max(10, 50 - (tempDiff * 2));
        const purityScore = Math.min(100, Math.round(basePurity + cauldronData.flaskPurityBonusPercent));
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const potionFlask: BrewedPotionFlask = {
            flaskId: `flask_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            potionEffectName: recipe.potionEffectName,
            purityRatingPercent: purityScore,
            durationSeconds: recipe.basePotionDurationSeconds,
            brewedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            potionFlask,
        };
    }
}