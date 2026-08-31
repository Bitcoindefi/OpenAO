import crypto from "node:crypto";

/**
 * Ancient Runic Leather Belt Pouch Bench, Brass Toggle Clasp & Alchemical Reagent Pouch Engine for OpenAO MMORPG.
 * Simulates belt pouch stitching benches and toggle setting anvils (Oak Pouch Stitching Bench, Runic Ironwood Reagent Pouch Rig, Celestial Void Seraphic Satchel Sanctum),
 * raw tanned calfskin and polished brass toggle clasps (Tanned Calfskin Pouch Blank, Polished Brass Toggle Clasp, Celestial Void Starlight Alchemical Leather),
 * adventurer belt pouches and seraphic bottomless satchel recipes (Adventurer Quick-Access Belt Pouch, Alchemist Spill-Proof Herb Pouch, Celestial Void Seraphic Bottomless Satchel),
 * independent quick-draw accessibility ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped potion consumable cooldown reduction and clamped herb freshness preservation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and pouch bench maintenance.
 */

export type PouchBenchType = "OAK_POUCH_STITCHING_BENCH" | "RUNIC_IRONWOOD_REAGENT_POUCH_RIG" | "CELESTIAL_VOID_SERAPHIC_SATCHEL_SANCTUM";
export type RawLeatherPouchType = "TANNED_CALFSKIN_POUCH_BLANK" | "POLISHED_BRASS_TOGGLE_CLASP" | "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_LEATHER";
export type AlchemicalPouchRecipeType = "ADVENTURER_QUICK_ACCESS_BELT_POUCH" | "ALCHEMIST_SPILL_PROOF_HERB_POUCH" | "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_SATCHEL";

export interface PouchBenchData {
    benchType: PouchBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    quickdrawBonusPercent: number;
}

export interface AlchemicalPouchRecipeData {
    recipeType: AlchemicalPouchRecipeType;
    requiredLeatherType: RawLeatherPouchType;
    requiredLeatherCount: number;
    basePotionCooldownReductionPercent: number;
    baseHerbFreshnessPreservationPercent: number;
}

export interface ActivePouchBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: PouchBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedAlchemicalPouch {
    pouchId: string;
    recipeType: AlchemicalPouchRecipeType;
    finalPotionCooldownReductionPercent: number;
    finalHerbFreshnessPreservationPercent: number;
    quickdrawAccessibilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherPouchType;
    remainingProvidedLeathers: RawLeatherPouchType[];
    craftedEpochMs: number;
}

export const POUCH_BENCH_CATALOG: Record<PouchBenchType, PouchBenchData> = {
    OAK_POUCH_STITCHING_BENCH: { benchType: "OAK_POUCH_STITCHING_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, quickdrawBonusPercent: 10 },
    RUNIC_IRONWOOD_REAGENT_POUCH_RIG: { benchType: "RUNIC_IRONWOOD_REAGENT_POUCH_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, quickdrawBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_SATCHEL_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_SATCHEL_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, quickdrawBonusPercent: 35 },
};

export const POUCH_RECIPE_CATALOG: Record<AlchemicalPouchRecipeType, AlchemicalPouchRecipeData> = {
    ADVENTURER_QUICK_ACCESS_BELT_POUCH: { recipeType: "ADVENTURER_QUICK_ACCESS_BELT_POUCH", requiredLeatherType: "TANNED_CALFSKIN_POUCH_BLANK", requiredLeatherCount: 2, basePotionCooldownReductionPercent: 20, baseHerbFreshnessPreservationPercent: 10 },
    ALCHEMIST_SPILL_PROOF_HERB_POUCH: { recipeType: "ALCHEMIST_SPILL_PROOF_HERB_POUCH", requiredLeatherType: "POLISHED_BRASS_TOGGLE_CLASP", requiredLeatherCount: 2, basePotionCooldownReductionPercent: 45, baseHerbFreshnessPreservationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_SATCHEL: { recipeType: "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_SATCHEL", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_ALCHEMICAL_LEATHER", requiredLeatherCount: 2, basePotionCooldownReductionPercent: 80, baseHerbFreshnessPreservationPercent: 60 },
};

export class AncientRunicLeatherBeltPouchBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(POUCH_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(POUCH_BENCH_CATALOG).map(b => b.quickdrawBonusPercent), 1),
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
     * Constructs and initializes a belt pouch stitching bench or toggle setting rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: PouchBenchType
    ): ActivePouchBench {
        const data = POUCH_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported pouch bench type: ${String(benchType)}`);
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
     * Stitches and fastens calfskin blanks and brass toggle clasps into alchemical belt pouches.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftPouch(
        bench: ActivePouchBench,
        recipeType: AlchemicalPouchRecipeType,
        providedLeathers: RawLeatherPouchType[],
        craftRoll?: number,
        accessibilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; pouch?: CraftedAlchemicalPouch; updatedBench?: ActivePouchBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherPouchType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Pouch bench is jammed or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = POUCH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = POUCH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown pouch recipe: ${String(recipeType)}` };
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
                reason: `Insufficient pouch leather: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Pouch seam ripped: toggle setting press mispunched clasp eyelet, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent quickdraw accessibility score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeAccessibilityRoll = typeof accessibilityRoll === "number" && Number.isFinite(accessibilityRoll) ? Math.max(0, Math.min(1, accessibilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.quickdrawBonusPercent / maxBonus) * 20;
        const accessibilityScore = Math.max(0, Math.min(100, Math.round(
            (safeAccessibilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((accessibilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCooldown = Math.max(0, Math.min(100, Math.round(recipe.basePotionCooldownReductionPercent * qualityMultiplier)));
        const finalFreshness = Math.max(0, Math.min(100, Math.round(recipe.baseHerbFreshnessPreservationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const pouch: CraftedAlchemicalPouch = {
            pouchId: `pouch_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPotionCooldownReductionPercent: finalCooldown,
            finalHerbFreshnessPreservationPercent: finalFreshness,
            quickdrawAccessibilityPercent: accessibilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            pouch,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-tightens toggle clamp vises and maintains pouch bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActivePouchBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActivePouchBench; newDurability: number; isFunctional: boolean } {
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