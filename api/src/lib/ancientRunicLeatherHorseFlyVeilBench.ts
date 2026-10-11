import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Fly Veil Bench, Mithril Mesh Weave Rig & Celestial Valkyrie Ear Bonnet Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian fly veil and ear protection crafting benches (Elder Fly Veil Bench, Runic Oak Fly Veil Rig, Celestial Void Valkyrie Fly Veil Sanctum),
 * raw tanned bull fly veil straps and tempered mithril mesh weave sets (Tanned Bull Fly Veil Strap, Tempered Mithril Mesh Weave, Celestial Void Astral Fly Veil Pelt),
 * novice expedition fly veils and sovereign aerial fly veil recipes (Novice Expedition Fly Veil, Warmaster Mithril Reinforced Fly Veil, Celestial Void Valkyrie Sovereign Fly Veil),
 * independent steed acoustic dampening ratings and insect deflection ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped acoustic dampening bonus and insect deflection scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse fly veil bench maintenance.
 */

export type FlyVeilBenchType = "ELDER_FLY_VEIL_BENCH" | "RUNIC_OAK_FLY_VEIL_RIG" | "CELESTIAL_VOID_VALKYRIE_FLY_VEIL_SANCTUM";
export type RawLeatherFlyVeilType = "TANNED_BULL_FLY_VEIL_STRAP" | "TEMPERED_MITHRIL_MESH_WEAVE" | "CELESTIAL_VOID_ASTRAL_FLY_VEIL_PELT";
export type FlyVeilRecipeType = "NOVICE_EXPEDITION_FLY_VEIL" | "WARMASTER_MITHRIL_REINFORCED_FLY_VEIL" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLY_VEIL";

export interface FlyVeilBenchData {
    benchType: FlyVeilBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    flyVeilStabilityBonusPercent: number;
}

export interface FlyVeilRecipeData {
    recipeType: FlyVeilRecipeType;
    requiredLeatherType: RawLeatherFlyVeilType;
    requiredLeatherCount: number;
    baseAcousticDampeningPercent: number;
    baseInsectDeflectionRatingPercent: number;
}

export interface ActiveFlyVeilBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: FlyVeilBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseFlyVeil {
    flyVeilId: string;
    recipeType: FlyVeilRecipeType;
    finalAcousticDampeningPercent: number;
    finalInsectDeflectionRatingPercent: number;
    flyVeilCrownStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherFlyVeilType;
    remainingProvidedLeathers: RawLeatherFlyVeilType[];
    craftedEpochMs: number;
}

export const FLY_VEIL_BENCH_CATALOG: Record<FlyVeilBenchType, FlyVeilBenchData> = {
    ELDER_FLY_VEIL_BENCH: { benchType: "ELDER_FLY_VEIL_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, flyVeilStabilityBonusPercent: 14 },
    RUNIC_OAK_FLY_VEIL_RIG: { benchType: "RUNIC_OAK_FLY_VEIL_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, flyVeilStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_FLY_VEIL_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_FLY_VEIL_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, flyVeilStabilityBonusPercent: 40 },
};

export const FLY_VEIL_RECIPE_CATALOG: Record<FlyVeilRecipeType, FlyVeilRecipeData> = {
    NOVICE_EXPEDITION_FLY_VEIL: { recipeType: "NOVICE_EXPEDITION_FLY_VEIL", requiredLeatherType: "TANNED_BULL_FLY_VEIL_STRAP", requiredLeatherCount: 2, baseAcousticDampeningPercent: 24, baseInsectDeflectionRatingPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_FLY_VEIL: { recipeType: "WARMASTER_MITHRIL_REINFORCED_FLY_VEIL", requiredLeatherType: "TEMPERED_MITHRIL_MESH_WEAVE", requiredLeatherCount: 2, baseAcousticDampeningPercent: 50, baseInsectDeflectionRatingPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLY_VEIL: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FLY_VEIL", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_FLY_VEIL_PELT", requiredLeatherCount: 2, baseAcousticDampeningPercent: 84, baseInsectDeflectionRatingPercent: 64 },
};

export class AncientRunicLeatherHorseFlyVeilBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(FLY_VEIL_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(FLY_VEIL_BENCH_CATALOG).map(b => b.flyVeilStabilityBonusPercent), 1),
    };

    /**
     * Generates a crypto-secure UUID or 128-bit hex string using node:crypto.
     */
    private static generateSecureId(): string {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return crypto.randomBytes(16).toString("hex");
    }

    /**
     * Generates a cryptographically secure random float strictly in [0, 1).
     */
    public static generateSecureRoll(): number {
        if (typeof crypto.randomInt === "function") {
            return crypto.randomInt(0, 1000000) / 1000000;
        }
        return crypto.randomBytes(4).readUInt32LE(0) / 0x100000000;
    }

    /**
     * Constructs and initializes a horse fly veil crafting bench or mesh-weave rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: FlyVeilBenchType
    ): ActiveFlyVeilBench {
        const data = FLY_VEIL_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse fly veil bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            leatherworkerPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Weaves and stitches fly veil straps and tempered mithril mesh into protective equestrian ear bonnets.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftFlyVeil(
        bench: ActiveFlyVeilBench,
        recipeType: FlyVeilRecipeType,
        providedLeathers: RawLeatherFlyVeilType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; flyVeil?: CraftedHorseFlyVeil; updatedBench?: ActiveFlyVeilBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherFlyVeilType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse fly veil bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = FLY_VEIL_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = FLY_VEIL_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse fly veil recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather materials
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                updatedBench: { ...bench },
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient fly veil straps/mithril mesh: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Create updated bench clone
        const updatedBench = { ...bench };

        // Deduct durability on clone
        updatedBench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (updatedBench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            updatedBench.currentDurability = Math.max(0, updatedBench.currentDurability);
            updatedBench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedLeathers];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredLeatherCount; i--) {
            if (remaining[i] === recipe.requiredLeatherType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = typeof craftRoll === "number" && Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : this.generateSecureRoll();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedBench,
                remainingDurability: updatedBench.currentDurability,
                remainingProvidedLeathers: remaining,
                reason: `Fly veil weave frayed: mithril ear mesh distorted under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent fly veil crown stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.flyVeilStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalAcoustic = Math.max(0, Math.min(100, Math.round(recipe.baseAcousticDampeningPercent * qualityMultiplier)));
        const finalDeflection = Math.max(0, Math.min(100, Math.round(recipe.baseInsectDeflectionRatingPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const flyVeil: CraftedHorseFlyVeil = {
            flyVeilId: `flyveil_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalAcousticDampeningPercent: finalAcoustic,
            finalInsectDeflectionRatingPercent: finalDeflection,
            flyVeilCrownStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            flyVeil,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail dust and maintains horse fly veil bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveFlyVeilBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveFlyVeilBench; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const updatedBench = { ...bench };
        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        updatedBench.currentDurability = Math.min(updatedBench.maxDurability, updatedBench.currentDurability + amt);
        updatedBench.isFunctional = updatedBench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            updatedBench,
            newDurability: updatedBench.currentDurability,
            isFunctional: updatedBench.isFunctional,
        };
    }
}
