import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Martingale Bench, Mithril Neck Strap Chape & Celestial Valkyrie Head Carriage Engine for OpenAO MMORPG.
 * Simulates martingale harness strap stitching benches and neck strap chape shaping rigs (Ash Horse Martingale Bench, Runic Ironwood Martingale Rig, Celestial Void Valkyrie Carriage Sanctum),
 * raw tanned deer-hide martingale straps and tempered mithril neck chape sets (Tanned Deer Hide Martingale Strap, Tempered Mithril Neck Chape Set, Celestial Void Astral Martingale Pelt),
 * novice running martingales and sovereign aerial standing martingale recipes (Novice Running Martingale, Warmaster Mithril Standing Martingale, Celestial Void Valkyrie Sovereign Martingale),
 * independent steed head carriage & bit compliance ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped head toss mitigation bonus and bit compliance mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse martingale bench maintenance.
 */

export type MartingaleBenchType = "ASH_HORSE_MARTINGALE_BENCH" | "RUNIC_IRONWOOD_MARTINGALE_RIG" | "CELESTIAL_VOID_VALKYRIE_CARRIAGE_SANCTUM";
export type RawLeatherMartingaleType = "TANNED_DEER_HIDE_MARTINGALE_STRAP" | "TEMPERED_MITHRIL_NECK_CHAPE_SET" | "CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT";
export type MartingaleRecipeType = "NOVICE_RUNNING_MARTINGALE" | "WARMASTER_MITHRIL_STANDING_MARTINGALE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE";

export interface MartingaleBenchData {
    benchType: MartingaleBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    carriageControlBonusPercent: number;
}

export interface MartingaleRecipeData {
    recipeType: MartingaleRecipeType;
    requiredLeatherType: RawLeatherMartingaleType;
    requiredLeatherCount: number;
    baseHeadTossMitigationPercent: number;
    baseBitComplianceBonusPercent: number;
}

export interface ActiveMartingaleBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: MartingaleBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseMartingale {
    martingaleId: string;
    recipeType: MartingaleRecipeType;
    finalHeadTossMitigationPercent: number;
    finalBitComplianceBonusPercent: number;
    headCarriagePercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherMartingaleType;
    remainingProvidedLeathers: RawLeatherMartingaleType[];
    craftedEpochMs: number;
}

export const MARTINGALE_BENCH_CATALOG: Record<MartingaleBenchType, MartingaleBenchData> = {
    ASH_HORSE_MARTINGALE_BENCH: { benchType: "ASH_HORSE_MARTINGALE_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, carriageControlBonusPercent: 14 },
    RUNIC_IRONWOOD_MARTINGALE_RIG: { benchType: "RUNIC_IRONWOOD_MARTINGALE_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, carriageControlBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CARRIAGE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CARRIAGE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, carriageControlBonusPercent: 40 },
};

export const MARTINGALE_RECIPE_CATALOG: Record<MartingaleRecipeType, MartingaleRecipeData> = {
    NOVICE_RUNNING_MARTINGALE: { recipeType: "NOVICE_RUNNING_MARTINGALE", requiredLeatherType: "TANNED_DEER_HIDE_MARTINGALE_STRAP", requiredLeatherCount: 2, baseHeadTossMitigationPercent: 24, baseBitComplianceBonusPercent: 14 },
    WARMASTER_MITHRIL_STANDING_MARTINGALE: { recipeType: "WARMASTER_MITHRIL_STANDING_MARTINGALE", requiredLeatherType: "TEMPERED_MITHRIL_NECK_CHAPE_SET", requiredLeatherCount: 2, baseHeadTossMitigationPercent: 50, baseBitComplianceBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_MARTINGALE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_MARTINGALE_PELT", requiredLeatherCount: 2, baseHeadTossMitigationPercent: 84, baseBitComplianceBonusPercent: 64 },
};

export class AncientRunicLeatherHorseMartingaleBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(MARTINGALE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(MARTINGALE_BENCH_CATALOG).map(b => b.carriageControlBonusPercent), 1),
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
     * Constructs and initializes a horse martingale stitching bench or rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: MartingaleBenchType
    ): ActiveMartingaleBench {
        const data = MARTINGALE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse martingale bench type: ${String(benchType)}`);
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
     * Stitches and rivets deer-hide straps and tempered mithril neck chapes into horse martingales.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftMartingale(
        bench: ActiveMartingaleBench,
        recipeType: MartingaleRecipeType,
        providedLeathers: RawLeatherMartingaleType[],
        craftRoll?: number,
        carriageRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; martingale?: CraftedHorseMartingale; updatedBench?: ActiveMartingaleBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherMartingaleType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse martingale bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = MARTINGALE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = MARTINGALE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse martingale recipe: ${String(recipeType)}` };
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
                reason: `Insufficient martingale straps/neck chape sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Neck strap chape misaligned: mithril fork ring warped during tensile riveting, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent head carriage score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeCarriageRoll = typeof carriageRoll === "number" && Number.isFinite(carriageRoll) ? Math.max(0, Math.min(1, carriageRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.carriageControlBonusPercent / maxBonus) * 20;
        const carriageScore = Math.max(0, Math.min(100, Math.round(
            (safeCarriageRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((carriageScore / 100) * 0.4); // 0.8 to 1.2x

        const finalHeadTossBonus = Math.max(0, Math.min(100, Math.round(recipe.baseHeadTossMitigationPercent * qualityMultiplier)));
        const finalBitComplianceBonus = Math.max(0, Math.min(100, Math.round(recipe.baseBitComplianceBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const martingale: CraftedHorseMartingale = {
            martingaleId: `martingale_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalHeadTossMitigationPercent: finalHeadTossBonus,
            finalBitComplianceBonusPercent: finalBitComplianceBonus,
            headCarriagePercent: carriageScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            martingale,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans stable arena dirt and maintains horse martingale bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveMartingaleBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveMartingaleBench; newDurability: number; isFunctional: boolean } {
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
