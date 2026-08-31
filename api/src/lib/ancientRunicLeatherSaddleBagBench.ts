import crypto from "node:crypto";

/**
 * Ancient Runic Leather Saddle Bag Bench, Brass Rivet Buckle & Mount Pannier Engine for OpenAO MMORPG.
 * Simulates saddle bag stitching benches and pannier riveting anvils (Oak Saddle Bag Bench, Runic Ironwood Mount Rig, Celestial Void Seraphic Caravan Sanctum),
 * raw tanned horsehide pannier blanks and brass riveted buckle sets (Tanned Horsehide Pannier Blank, Brass Riveted Buckle Set, Celestial Void Starlight Sovereign Caravan Leather),
 * courier fast-access saddle bags and seraphic dimension-folded haversack recipes (Courier Fast-Access Saddle Bag, Caravan Heavy Double Pannier, Celestial Void Seraphic Dimension-Folded Mount Haversack),
 * independent weight distribution & quick-loot accessibility ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped mount carrying capacity bonus and clamped mount stamina depletion mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and saddle bag bench maintenance.
 */

export type SaddleBagBenchType = "OAK_SADDLE_BAG_BENCH" | "RUNIC_IRONWOOD_MOUNT_RIG" | "CELESTIAL_VOID_SERAPHIC_CARAVAN_SANCTUM";
export type RawLeatherSaddleBagType = "TANNED_HORSEHIDE_PANNIER_BLANK" | "BRASS_RIVETED_BUCKLE_SET" | "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_CARAVAN_LEATHER";
export type MountSaddleBagRecipeType = "COURIER_FAST_ACCESS_SADDLE_BAG" | "CARAVAN_HEAVY_DOUBLE_PANNIER" | "CELESTIAL_VOID_SERAPHIC_DIMENSION_FOLDED_MOUNT_HAVERSACK";

export interface SaddleBagBenchData {
    benchType: SaddleBagBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    quicklootBonusPercent: number;
}

export interface MountSaddleBagRecipeData {
    recipeType: MountSaddleBagRecipeType;
    requiredLeatherType: RawLeatherSaddleBagType;
    requiredLeatherCount: number;
    baseMountCarryingCapacityBonusPercent: number;
    baseMountStaminaDepletionMitigationPercent: number;
}

export interface ActiveSaddleBagBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SaddleBagBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedMountSaddleBag {
    saddleBagId: string;
    recipeType: MountSaddleBagRecipeType;
    finalMountCarryingCapacityBonusPercent: number;
    finalMountStaminaDepletionMitigationPercent: number;
    quicklootAccessibilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherSaddleBagType;
    remainingProvidedLeathers: RawLeatherSaddleBagType[];
    craftedEpochMs: number;
}

export const SADDLE_BAG_BENCH_CATALOG: Record<SaddleBagBenchType, SaddleBagBenchData> = {
    OAK_SADDLE_BAG_BENCH: { benchType: "OAK_SADDLE_BAG_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, quicklootBonusPercent: 10 },
    RUNIC_IRONWOOD_MOUNT_RIG: { benchType: "RUNIC_IRONWOOD_MOUNT_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, quicklootBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_CARAVAN_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_CARAVAN_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, quicklootBonusPercent: 35 },
};

export const SADDLE_BAG_RECIPE_CATALOG: Record<MountSaddleBagRecipeType, MountSaddleBagRecipeData> = {
    COURIER_FAST_ACCESS_SADDLE_BAG: { recipeType: "COURIER_FAST_ACCESS_SADDLE_BAG", requiredLeatherType: "TANNED_HORSEHIDE_PANNIER_BLANK", requiredLeatherCount: 2, baseMountCarryingCapacityBonusPercent: 20, baseMountStaminaDepletionMitigationPercent: 10 },
    CARAVAN_HEAVY_DOUBLE_PANNIER: { recipeType: "CARAVAN_HEAVY_DOUBLE_PANNIER", requiredLeatherType: "BRASS_RIVETED_BUCKLE_SET", requiredLeatherCount: 2, baseMountCarryingCapacityBonusPercent: 45, baseMountStaminaDepletionMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_DIMENSION_FOLDED_MOUNT_HAVERSACK: { recipeType: "CELESTIAL_VOID_SERAPHIC_DIMENSION_FOLDED_MOUNT_HAVERSACK", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_CARAVAN_LEATHER", requiredLeatherCount: 2, baseMountCarryingCapacityBonusPercent: 80, baseMountStaminaDepletionMitigationPercent: 60 },
};

export class AncientRunicLeatherSaddleBagBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SADDLE_BAG_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SADDLE_BAG_BENCH_CATALOG).map(b => b.quicklootBonusPercent), 1),
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
     * Constructs and initializes a saddle bag stitching bench or mount pannier rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: SaddleBagBenchType
    ): ActiveSaddleBagBench {
        const data = SADDLE_BAG_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported saddle bag bench type: ${String(benchType)}`);
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
     * Stitches and rivets horsehide pannier blanks and brass buckles into mount saddle bags.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftSaddleBag(
        bench: ActiveSaddleBagBench,
        recipeType: MountSaddleBagRecipeType,
        providedLeathers: RawLeatherSaddleBagType[],
        craftRoll?: number,
        accessibilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; saddleBag?: CraftedMountSaddleBag; updatedBench?: ActiveSaddleBagBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherSaddleBagType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Saddle bag bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SADDLE_BAG_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SADDLE_BAG_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown saddle bag recipe: ${String(recipeType)}` };
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
                reason: `Insufficient saddle bag leather/buckles: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Gusset torn: brass rivet punch sheared pannier flap seam, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent quick-loot accessibility score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeAccessibilityRoll = typeof accessibilityRoll === "number" && Number.isFinite(accessibilityRoll) ? Math.max(0, Math.min(1, accessibilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.quicklootBonusPercent / maxBonus) * 20;
        const accessibilityScore = Math.max(0, Math.min(100, Math.round(
            (safeAccessibilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((accessibilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCapacityBonus = Math.max(0, Math.min(100, Math.round(recipe.baseMountCarryingCapacityBonusPercent * qualityMultiplier)));
        const finalStaminaMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseMountStaminaDepletionMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const saddleBag: CraftedMountSaddleBag = {
            saddleBagId: `saddlebag_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMountCarryingCapacityBonusPercent: finalCapacityBonus,
            finalMountStaminaDepletionMitigationPercent: finalStaminaMitigate,
            quicklootAccessibilityPercent: accessibilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            saddleBag,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-tightens rivet punch anvils and maintains saddle bag bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveSaddleBagBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveSaddleBagBench; newDurability: number; isFunctional: boolean } {
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