import crypto from "node:crypto";

/**
 * Ancient Runic Leather Tent Canopy Bench, Waxed Seam Awl & Camp Pavilion Engine for OpenAO MMORPG.
 * Simulates tent canopy stitching benches and waxed seam awls (Oak Tent Canopy Bench, Runic Ironwood Pavilion Rig, Celestial Void Seraphic Shelter Sanctum),
 * raw tanned mammoth hide canopies and waxed heavy hemp threads (Tanned Mammoth Hide Canopy, Waxed Heavy Hemp Thread, Celestial Void Starlight Sovereign Pavilion Leather),
 * fast-pitch scout shelters and seraphic fortress canopy recipes (Scout Fast-Pitch Shelter Canopy, Guild Veteran Weatherproof Pavilion, Celestial Void Seraphic Fortress Canopy),
 * independent elemental storm insulation & rest recovery ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped elemental weather resistance and clamped camp rest recovery scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and canopy bench maintenance.
 */

export type CanopyBenchType = "OAK_TENT_CANOPY_BENCH" | "RUNIC_IRONWOOD_PAVILION_RIG" | "CELESTIAL_VOID_SERAPHIC_SHELTER_SANCTUM";
export type RawLeatherCanopyType = "TANNED_MAMMOTH_HIDE_CANOPY" | "WAXED_HEAVY_HEMP_THREAD" | "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_PAVILION_LEATHER";
export type ExpeditionCanopyRecipeType = "SCOUT_FAST_PITCH_SHELTER_CANOPY" | "GUILD_VETERAN_WEATHERPROOF_PAVILION" | "CELESTIAL_VOID_SERAPHIC_FORTRESS_CANOPY";

export interface CanopyBenchData {
    benchType: CanopyBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    restBonusPercent: number;
}

export interface ExpeditionCanopyRecipeData {
    recipeType: ExpeditionCanopyRecipeType;
    requiredLeatherType: RawLeatherCanopyType;
    requiredLeatherCount: number;
    baseElementalWeatherResistancePercent: number;
    baseCampRestRecoveryPercent: number;
}

export interface ActiveCanopyBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CanopyBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedExpeditionCanopy {
    canopyId: string;
    recipeType: ExpeditionCanopyRecipeType;
    finalElementalWeatherResistancePercent: number;
    finalCampRestRecoveryPercent: number;
    restRecoveryRatingPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCanopyType;
    remainingProvidedLeathers: RawLeatherCanopyType[];
    craftedEpochMs: number;
}

export const CANOPY_BENCH_CATALOG: Record<CanopyBenchType, CanopyBenchData> = {
    OAK_TENT_CANOPY_BENCH: { benchType: "OAK_TENT_CANOPY_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, restBonusPercent: 10 },
    RUNIC_IRONWOOD_PAVILION_RIG: { benchType: "RUNIC_IRONWOOD_PAVILION_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, restBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_SHELTER_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_SHELTER_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, restBonusPercent: 35 },
};

export const CANOPY_RECIPE_CATALOG: Record<ExpeditionCanopyRecipeType, ExpeditionCanopyRecipeData> = {
    SCOUT_FAST_PITCH_SHELTER_CANOPY: { recipeType: "SCOUT_FAST_PITCH_SHELTER_CANOPY", requiredLeatherType: "TANNED_MAMMOTH_HIDE_CANOPY", requiredLeatherCount: 2, baseElementalWeatherResistancePercent: 20, baseCampRestRecoveryPercent: 10 },
    GUILD_VETERAN_WEATHERPROOF_PAVILION: { recipeType: "GUILD_VETERAN_WEATHERPROOF_PAVILION", requiredLeatherType: "WAXED_HEAVY_HEMP_THREAD", requiredLeatherCount: 2, baseElementalWeatherResistancePercent: 45, baseCampRestRecoveryPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_FORTRESS_CANOPY: { recipeType: "CELESTIAL_VOID_SERAPHIC_FORTRESS_CANOPY", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_PAVILION_LEATHER", requiredLeatherCount: 2, baseElementalWeatherResistancePercent: 80, baseCampRestRecoveryPercent: 60 },
};

export class AncientRunicLeatherTentCanopyBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CANOPY_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CANOPY_BENCH_CATALOG).map(b => b.restBonusPercent), 1),
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
     * Constructs and initializes a tent canopy stitching bench or shelter rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CanopyBenchType
    ): ActiveCanopyBench {
        const data = CANOPY_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported canopy bench type: ${String(benchType)}`);
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
     * Stitches and seals mammoth hide canopies and hemp threads into expedition shelters and pavilions.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCanopy(
        bench: ActiveCanopyBench,
        recipeType: ExpeditionCanopyRecipeType,
        providedLeathers: RawLeatherCanopyType[],
        craftRoll?: number,
        restRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; canopy?: CraftedExpeditionCanopy; updatedBench?: ActiveCanopyBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCanopyType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Tent canopy bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CANOPY_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CANOPY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown canopy recipe: ${String(recipeType)}` };
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
                reason: `Insufficient canopy leather/thread: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Seam ripped: waxed awl needle snagged mammoth hide ridge, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent rest recovery score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeRestRoll = typeof restRoll === "number" && Number.isFinite(restRoll) ? Math.max(0, Math.min(1, restRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.restBonusPercent / maxBonus) * 20;
        const restScore = Math.max(0, Math.min(100, Math.round(
            (safeRestRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((restScore / 100) * 0.4); // 0.8 to 1.2x

        const finalWeatherResist = Math.max(0, Math.min(100, Math.round(recipe.baseElementalWeatherResistancePercent * qualityMultiplier)));
        const finalRestRecover = Math.max(0, Math.min(100, Math.round(recipe.baseCampRestRecoveryPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const canopy: CraftedExpeditionCanopy = {
            canopyId: `canopy_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalElementalWeatherResistancePercent: finalWeatherResist,
            finalCampRestRecoveryPercent: finalRestRecover,
            restRecoveryRatingPercent: restScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            canopy,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-lubricates seam awl guides and maintains tent canopy bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCanopyBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCanopyBench; newDurability: number; isFunctional: boolean } {
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