import crypto from "node:crypto";

/**
 * Ancient Runic Leather Bellows Forge Craft, Oxhide Bellows Valve & Arcane Blast Furnace Engine for OpenAO MMORPG.
 * Simulates blacksmith bellows benches and air chamber frames (Oak Bellows Framing Bench, Runic Ironwood Double-Lung Bellows Rig, Celestial Void Seraphic Blast Sanctum),
 * raw tanned oxhide diaphragms and cast brass blast tuyeres (Tanned Oxhide Bellows Diaphragm, Cast Brass Blast Tuyere Nozzle, Celestial Void Starlight Pneumatic Leather),
 * forge breeze bellows and seraphic pneumatic forge recipes (Apprentice Forge-Breeze Bellows, Master Crucible Air-Blast Bellows, Celestial Void Seraphic Pneumatic Forge Engine),
 * independent blast pressure ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped forge smelting speed and clamped ingot yield purity scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and bellows bench maintenance.
 */

export type BellowsBenchType = "OAK_BELLOWS_FRAMING_BENCH" | "RUNIC_IRONWOOD_DOUBLE_LUNG_BELLOWS_RIG" | "CELESTIAL_VOID_SERAPHIC_BLAST_SANCTUM";
export type RawLeatherBellowsType = "TANNED_OXHIDE_BELLOWS_DIAPHRAGM" | "CAST_BRASS_BLAST_TUYERE_NOZZLE" | "CELESTIAL_VOID_STARLIGHT_PNEUMATIC_LEATHER";
export type BlastBellowsRecipeType = "APPRENTICE_FORGE_BREEZE_BELLOWS" | "MASTER_CRUCIBLE_AIR_BLAST_BELLOWS" | "CELESTIAL_VOID_SERAPHIC_PNEUMATIC_FORGE_ENGINE";

export interface BellowsBenchData {
    benchType: BellowsBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    blastBonusPercent: number;
}

export interface BlastBellowsRecipeData {
    recipeType: BlastBellowsRecipeType;
    requiredLeatherType: RawLeatherBellowsType;
    requiredLeatherCount: number;
    baseSmeltingSpeedPercent: number;
    baseIngotYieldPurityPercent: number;
}

export interface ActiveBellowsBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BellowsBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedBlastBellows {
    bellowsId: string;
    recipeType: BlastBellowsRecipeType;
    finalSmeltingSpeedPercent: number;
    finalIngotYieldPurityPercent: number;
    blastPressurePercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBellowsType;
    remainingProvidedLeathers: RawLeatherBellowsType[];
    craftedEpochMs: number;
}

export const BELLOWS_BENCH_CATALOG: Record<BellowsBenchType, BellowsBenchData> = {
    OAK_BELLOWS_FRAMING_BENCH: { benchType: "OAK_BELLOWS_FRAMING_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, blastBonusPercent: 10 },
    RUNIC_IRONWOOD_DOUBLE_LUNG_BELLOWS_RIG: { benchType: "RUNIC_IRONWOOD_DOUBLE_LUNG_BELLOWS_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, blastBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_BLAST_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_BLAST_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, blastBonusPercent: 35 },
};

export const BELLOWS_RECIPE_CATALOG: Record<BlastBellowsRecipeType, BlastBellowsRecipeData> = {
    APPRENTICE_FORGE_BREEZE_BELLOWS: { recipeType: "APPRENTICE_FORGE_BREEZE_BELLOWS", requiredLeatherType: "TANNED_OXHIDE_BELLOWS_DIAPHRAGM", requiredLeatherCount: 2, baseSmeltingSpeedPercent: 20, baseIngotYieldPurityPercent: 10 },
    MASTER_CRUCIBLE_AIR_BLAST_BELLOWS: { recipeType: "MASTER_CRUCIBLE_AIR_BLAST_BELLOWS", requiredLeatherType: "CAST_BRASS_BLAST_TUYERE_NOZZLE", requiredLeatherCount: 2, baseSmeltingSpeedPercent: 45, baseIngotYieldPurityPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_PNEUMATIC_FORGE_ENGINE: { recipeType: "CELESTIAL_VOID_SERAPHIC_PNEUMATIC_FORGE_ENGINE", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_PNEUMATIC_LEATHER", requiredLeatherCount: 2, baseSmeltingSpeedPercent: 80, baseIngotYieldPurityPercent: 60 },
};

export class AncientRunicLeatherBellowsForgeCraftEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BELLOWS_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BELLOWS_BENCH_CATALOG).map(b => b.blastBonusPercent), 1),
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
     * Constructs and initializes a blacksmith bellows framing bench or double-lung rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BellowsBenchType
    ): ActiveBellowsBench {
        const data = BELLOWS_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported bellows bench type: ${String(benchType)}`);
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
     * Constructs and rivets oxhide bellows diaphragms and brass nozzles into forge bellows.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static craftBellows(
        bench: ActiveBellowsBench,
        recipeType: BlastBellowsRecipeType,
        providedLeathers: RawLeatherBellowsType[],
        craftRoll?: number,
        pressureRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; bellows?: CraftedBlastBellows; updatedBench?: ActiveBellowsBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBellowsType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Bellows bench is jammed or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BELLOWS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BELLOWS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bellows recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather materials
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient bellows leather: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        bench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            bench.currentDurability = Math.max(0, bench.currentDurability);
            bench.isFunctional = false;
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
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: remaining,
                reason: `Diaphragm torn: pressure clamping seam blew oxhide pleat, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent blast pressure score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safePressureRoll = typeof pressureRoll === "number" && Number.isFinite(pressureRoll) ? Math.max(0, Math.min(1, pressureRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.blastBonusPercent / maxBonus) * 20;
        const pressureScore = Math.max(0, Math.min(100, Math.round(
            (safePressureRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((pressureScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpeed = Math.max(0, Math.min(100, Math.round(recipe.baseSmeltingSpeedPercent * qualityMultiplier)));
        const finalPurity = Math.max(0, Math.min(100, Math.round(recipe.baseIngotYieldPurityPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const bellows: CraftedBlastBellows = {
            bellowsId: `bellows_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSmeltingSpeedPercent: finalSpeed,
            finalIngotYieldPurityPercent: finalPurity,
            blastPressurePercent: pressureScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            bellows,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-leathers hinge flaps and maintains bellows framing bench.
     */
    public static maintainBench(
        bench: ActiveBellowsBench,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        bench.currentDurability = Math.min(bench.maxDurability, bench.currentDurability + amt);
        bench.isFunctional = bench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: bench.currentDurability,
            isFunctional: bench.isFunctional,
        };
    }
}