import crypto from "node:crypto";

/**
 * Ancient Runic Leather Tome Binding Bench, Gold Leaf Tooling Wheel & Grimoire Spine Engine for OpenAO MMORPG.
 * Simulates tome binding presses and gold leaf tooling wheels (Oak Tome Binding Press, Runic Ironwood Gold Leaf Tooling Wheel, Celestial Void Seraphic Grimoire Sanctum),
 * raw tanned calfskin vellum and burnished gold tooling foils (Tanned Calfskin Vellum Folio, Burnished Gold Leaf Tooling Foil, Celestial Void Starlight Chronomantic Leather),
 * apprentice cantrip spellbooks and seraphic chronomantic tome recipes (Apprentice Cantrip Spellbook, Archmage Prismatic Grimoire, Celestial Void Seraphic Chronomantic Tome),
 * independent mana conductivity ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped spell mana cost reduction and clamped spell critical magnitude scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and tome bench maintenance.
 */

export type TomeBenchType = "OAK_TOME_BINDING_PRESS" | "RUNIC_IRONWOOD_GOLD_LEAF_TOOLING_WHEEL" | "CELESTIAL_VOID_SERAPHIC_GRIMOIRE_SANCTUM";
export type RawLeatherTomeType = "TANNED_CALFSKIN_VELLUM_FOLIO" | "BURNISHED_GOLD_LEAF_TOOLING_FOIL" | "CELESTIAL_VOID_STARLIGHT_CHRONOMANTIC_LEATHER";
export type SpellbookTomeRecipeType = "APPRENTICE_CANTRIP_SPELLBOOK" | "ARCHMAGE_PRISMATIC_GRIMOIRE" | "CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_TOME";

export interface TomeBenchData {
    benchType: TomeBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    manaBonusPercent: number;
}

export interface SpellbookTomeRecipeData {
    recipeType: SpellbookTomeRecipeType;
    requiredLeatherType: RawLeatherTomeType;
    requiredLeatherCount: number;
    baseManaCostReductionPercent: number;
    baseSpellCriticalMagnitudePercent: number;
}

export interface ActiveTomeBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: TomeBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedSpellbookTome {
    tomeId: string;
    recipeType: SpellbookTomeRecipeType;
    finalManaCostReductionPercent: number;
    finalSpellCriticalMagnitudePercent: number;
    manaConductivityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherTomeType;
    remainingProvidedLeathers: RawLeatherTomeType[];
    craftedEpochMs: number;
}

export const TOME_BENCH_CATALOG: Record<TomeBenchType, TomeBenchData> = {
    OAK_TOME_BINDING_PRESS: { benchType: "OAK_TOME_BINDING_PRESS", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, manaBonusPercent: 10 },
    RUNIC_IRONWOOD_GOLD_LEAF_TOOLING_WHEEL: { benchType: "RUNIC_IRONWOOD_GOLD_LEAF_TOOLING_WHEEL", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, manaBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_GRIMOIRE_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_GRIMOIRE_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, manaBonusPercent: 35 },
};

export const TOME_RECIPE_CATALOG: Record<SpellbookTomeRecipeType, SpellbookTomeRecipeData> = {
    APPRENTICE_CANTRIP_SPELLBOOK: { recipeType: "APPRENTICE_CANTRIP_SPELLBOOK", requiredLeatherType: "TANNED_CALFSKIN_VELLUM_FOLIO", requiredLeatherCount: 2, baseManaCostReductionPercent: 20, baseSpellCriticalMagnitudePercent: 10 },
    ARCHMAGE_PRISMATIC_GRIMOIRE: { recipeType: "ARCHMAGE_PRISMATIC_GRIMOIRE", requiredLeatherType: "BURNISHED_GOLD_LEAF_TOOLING_FOIL", requiredLeatherCount: 2, baseManaCostReductionPercent: 45, baseSpellCriticalMagnitudePercent: 25 },
    CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_TOME: { recipeType: "CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_TOME", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_CHRONOMANTIC_LEATHER", requiredLeatherCount: 2, baseManaCostReductionPercent: 80, baseSpellCriticalMagnitudePercent: 60 },
};

export class AncientRunicLeatherTomeBindingBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(TOME_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(TOME_BENCH_CATALOG).map(b => b.manaBonusPercent), 1),
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
     * Constructs and initializes a tome binding press or tooling wheel.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: TomeBenchType
    ): ActiveTomeBench {
        const data = TOME_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported tome bench type: ${String(benchType)}`);
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
     * Presses and gilds calfskin vellum and gold tooling foils into arcane grimoires.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftTome(
        bench: ActiveTomeBench,
        recipeType: SpellbookTomeRecipeType,
        providedLeathers: RawLeatherTomeType[],
        craftRoll?: number,
        conductivityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; tome?: CraftedSpellbookTome; updatedBench?: ActiveTomeBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherTomeType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Tome press is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = TOME_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = TOME_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown tome recipe: ${String(recipeType)}` };
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
                reason: `Insufficient vellum/leather: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Spine fractured: binding press crushed gold leaf folio hinge, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent mana conductivity score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeConductivityRoll = typeof conductivityRoll === "number" && Number.isFinite(conductivityRoll) ? Math.max(0, Math.min(1, conductivityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.manaBonusPercent / maxBonus) * 20;
        const conductivityScore = Math.max(0, Math.min(100, Math.round(
            (safeConductivityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((conductivityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalReduction = Math.max(0, Math.min(100, Math.round(recipe.baseManaCostReductionPercent * qualityMultiplier)));
        const finalCritical = Math.max(0, Math.min(100, Math.round(recipe.baseSpellCriticalMagnitudePercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const tome: CraftedSpellbookTome = {
            tomeId: `tome_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalManaCostReductionPercent: finalReduction,
            finalSpellCriticalMagnitudePercent: finalCritical,
            manaConductivityPercent: conductivityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            tome,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-lubricates press screw threads and maintains tome binding bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveTomeBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveTomeBench; newDurability: number; isFunctional: boolean } {
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