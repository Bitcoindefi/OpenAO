import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Saddle Bags Bench, Mithril Flap Clasp & Celestial Valkyrie Expedition Engine for OpenAO MMORPG.
 * Simulates pannier strap stitching benches and flap clasp tension rigs (Elder Saddle Bags Bench, Runic Oak Pannier Rig, Celestial Void Valkyrie Expedition Sanctum),
 * raw tanned buffalo pannier straps and tempered mithril flap clasp sets (Tanned Buffalo Pannier Strap, Tempered Mithril Flap Clasp Set, Celestial Void Astral Bag Pelt),
 * novice expedition trail saddle bags and sovereign aerial bag recipes (Novice Expedition Trail Saddle Bags, Warmaster Mithril Flap Saddle Bags, Celestial Void Valkyrie Sovereign Saddle Bags),
 * independent steed payload-sway mitigation & payload balance ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped payload sway mitigation bonus and cargo volume capacity scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse saddle bags bench maintenance.
 */

export type SaddleBagsBenchType = "ELDER_SADDLE_BAGS_BENCH" | "RUNIC_OAK_PANNIER_RIG" | "CELESTIAL_VOID_VALKYRIE_EXPEDITION_SANCTUM";
export type RawLeatherSaddleBagsType = "TANNED_BUFFALO_PANNIER_STRAP" | "TEMPERED_MITHRIL_FLAP_CLASP_SET" | "CELESTIAL_VOID_ASTRAL_BAG_PELT";
export type SaddleBagsRecipeType = "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS" | "WARMASTER_MITHRIL_FLAP_SADDLE_BAGS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SADDLE_BAGS";

export interface SaddleBagsBenchData {
    benchType: SaddleBagsBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    payloadBalanceBonusPercent: number;
}

export interface SaddleBagsRecipeData {
    recipeType: SaddleBagsRecipeType;
    requiredLeatherType: RawLeatherSaddleBagsType;
    requiredLeatherCount: number;
    basePayloadSwayMitigationPercent: number;
    baseCargoVolumeCapacityBonusPercent: number;
}

export interface ActiveSaddleBagsBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SaddleBagsBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseSaddleBags {
    saddleBagsId: string;
    recipeType: SaddleBagsRecipeType;
    finalPayloadSwayMitigationPercent: number;
    finalCargoVolumeCapacityBonusPercent: number;
    payloadBalancePercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherSaddleBagsType;
    remainingProvidedLeathers: RawLeatherSaddleBagsType[];
    craftedEpochMs: number;
}

export const SADDLE_BAGS_BENCH_CATALOG: Record<SaddleBagsBenchType, SaddleBagsBenchData> = {
    ELDER_SADDLE_BAGS_BENCH: { benchType: "ELDER_SADDLE_BAGS_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, payloadBalanceBonusPercent: 14 },
    RUNIC_OAK_PANNIER_RIG: { benchType: "RUNIC_OAK_PANNIER_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, payloadBalanceBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_EXPEDITION_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_EXPEDITION_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, payloadBalanceBonusPercent: 40 },
};

export const SADDLE_BAGS_RECIPE_CATALOG: Record<SaddleBagsRecipeType, SaddleBagsRecipeData> = {
    NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS: { recipeType: "NOVICE_EXPEDITION_TRAIL_SADDLE_BAGS", requiredLeatherType: "TANNED_BUFFALO_PANNIER_STRAP", requiredLeatherCount: 2, basePayloadSwayMitigationPercent: 24, baseCargoVolumeCapacityBonusPercent: 14 },
    WARMASTER_MITHRIL_FLAP_SADDLE_BAGS: { recipeType: "WARMASTER_MITHRIL_FLAP_SADDLE_BAGS", requiredLeatherType: "TEMPERED_MITHRIL_FLAP_CLASP_SET", requiredLeatherCount: 2, basePayloadSwayMitigationPercent: 50, baseCargoVolumeCapacityBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SADDLE_BAGS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_SADDLE_BAGS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_BAG_PELT", requiredLeatherCount: 2, basePayloadSwayMitigationPercent: 84, baseCargoVolumeCapacityBonusPercent: 64 },
};

export class AncientRunicLeatherHorseSaddleBagsBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SADDLE_BAGS_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SADDLE_BAGS_BENCH_CATALOG).map(b => b.payloadBalanceBonusPercent), 1),
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
     * Constructs and initializes a horse saddle bags stitching bench or pannier rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: SaddleBagsBenchType
    ): ActiveSaddleBagsBench {
        const data = SADDLE_BAGS_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse saddle bags bench type: ${String(benchType)}`);
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
     * Stitches and tensions pannier straps and tempered mithril flap clasps into horse saddle bags.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftSaddleBags(
        bench: ActiveSaddleBagsBench,
        recipeType: SaddleBagsRecipeType,
        providedLeathers: RawLeatherSaddleBagsType[],
        craftRoll?: number,
        balanceRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; saddleBags?: CraftedHorseSaddleBags; updatedBench?: ActiveSaddleBagsBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherSaddleBagsType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse saddle bags bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SADDLE_BAGS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SADDLE_BAGS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse saddle bags recipe: ${String(recipeType)}` };
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
                reason: `Insufficient pannier straps/flap clasps: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Pannier strap misaligned: mithril flap clasp distorted during rivet clamping, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent payload balance score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBalanceRoll = typeof balanceRoll === "number" && Number.isFinite(balanceRoll) ? Math.max(0, Math.min(1, balanceRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.payloadBalanceBonusPercent / maxBonus) * 20;
        const balanceScore = Math.max(0, Math.min(100, Math.round(
            (safeBalanceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((balanceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSwayMitigation = Math.max(0, Math.min(100, Math.round(recipe.basePayloadSwayMitigationPercent * qualityMultiplier)));
        const finalCargoBonus = Math.max(0, Math.min(100, Math.round(recipe.baseCargoVolumeCapacityBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const saddleBags: CraftedHorseSaddleBags = {
            saddleBagsId: `saddlebags_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPayloadSwayMitigationPercent: finalSwayMitigation,
            finalCargoVolumeCapacityBonusPercent: finalCargoBonus,
            payloadBalancePercent: balanceScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            saddleBags,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse saddle bags bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveSaddleBagsBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveSaddleBagsBench; newDurability: number; isFunctional: boolean } {
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
