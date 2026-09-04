import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Halter Bench, Mithril Noseband Ring & Celestial Valkyrie Stable Rig Engine for OpenAO MMORPG.
 * Simulates paddock halter strap stitching benches and noseband ring shaping rigs (Ash Horse Halter Bench, Runic Ironwood Halter Rig, Celestial Void Valkyrie Stable Sanctum),
 * raw tanned moose-hide halter straps and tempered mithril noseband ring sets (Tanned Moose Hide Halter Strap, Tempered Mithril Noseband Ring Set, Celestial Void Astral Halter Pelt),
 * novice stable paddock halters and sovereign aerial stable halter recipes (Novice Stable Paddock Halter, Warmaster Mithril Ring Halter, Celestial Void Valkyrie Sovereign Halter),
 * independent steed halter docility & lead control ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped tether slip mitigation bonus and lead docility mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse halter bench maintenance.
 */

export type HalterBenchType = "ASH_HORSE_HALTER_BENCH" | "RUNIC_IRONWOOD_HALTER_RIG" | "CELESTIAL_VOID_VALKYRIE_STABLE_SANCTUM";
export type RawLeatherHalterType = "TANNED_MOOSE_HIDE_HALTER_STRAP" | "TEMPERED_MITHRIL_NOSEBAND_RING_SET" | "CELESTIAL_VOID_ASTRAL_HALTER_PELT";
export type HalterRecipeType = "NOVICE_STABLE_PADDOCK_HALTER" | "WARMASTER_MITHRIL_RING_HALTER" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HALTER";

export interface HalterBenchData {
    benchType: HalterBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    leadControlBonusPercent: number;
}

export interface HalterRecipeData {
    recipeType: HalterRecipeType;
    requiredLeatherType: RawLeatherHalterType;
    requiredLeatherCount: number;
    baseTetherSlipMitigationPercent: number;
    baseLeadDocilityBonusPercent: number;
}

export interface ActiveHalterBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: HalterBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseHalter {
    halterId: string;
    recipeType: HalterRecipeType;
    finalTetherSlipMitigationPercent: number;
    finalLeadDocilityBonusPercent: number;
    leadControlPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherHalterType;
    remainingProvidedLeathers: RawLeatherHalterType[];
    craftedEpochMs: number;
}

export const HALTER_BENCH_CATALOG: Record<HalterBenchType, HalterBenchData> = {
    ASH_HORSE_HALTER_BENCH: { benchType: "ASH_HORSE_HALTER_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, leadControlBonusPercent: 14 },
    RUNIC_IRONWOOD_HALTER_RIG: { benchType: "RUNIC_IRONWOOD_HALTER_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, leadControlBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_STABLE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_STABLE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, leadControlBonusPercent: 40 },
};

export const HALTER_RECIPE_CATALOG: Record<HalterRecipeType, HalterRecipeData> = {
    NOVICE_STABLE_PADDOCK_HALTER: { recipeType: "NOVICE_STABLE_PADDOCK_HALTER", requiredLeatherType: "TANNED_MOOSE_HIDE_HALTER_STRAP", requiredLeatherCount: 2, baseTetherSlipMitigationPercent: 24, baseLeadDocilityBonusPercent: 14 },
    WARMASTER_MITHRIL_RING_HALTER: { recipeType: "WARMASTER_MITHRIL_RING_HALTER", requiredLeatherType: "TEMPERED_MITHRIL_NOSEBAND_RING_SET", requiredLeatherCount: 2, baseTetherSlipMitigationPercent: 50, baseLeadDocilityBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HALTER: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_HALTER", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_HALTER_PELT", requiredLeatherCount: 2, baseTetherSlipMitigationPercent: 84, baseLeadDocilityBonusPercent: 64 },
};

export class AncientRunicLeatherHorseHalterBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(HALTER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(HALTER_BENCH_CATALOG).map(b => b.leadControlBonusPercent), 1),
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
     * Constructs and initializes a horse halter stitching bench or rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: HalterBenchType
    ): ActiveHalterBench {
        const data = HALTER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse halter bench type: ${String(benchType)}`);
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
     * Stitches and rivets moose-hide straps and tempered mithril noseband rings into horse halters.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftHalter(
        bench: ActiveHalterBench,
        recipeType: HalterRecipeType,
        providedLeathers: RawLeatherHalterType[],
        craftRoll?: number,
        controlRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; halter?: CraftedHorseHalter; updatedBench?: ActiveHalterBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherHalterType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse halter bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = HALTER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = HALTER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse halter recipe: ${String(recipeType)}` };
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
                reason: `Insufficient halter straps/noseband ring sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Noseband ring misaligned: mithril lead ring sheared during tensile adjustment, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent lead control score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeControlRoll = typeof controlRoll === "number" && Number.isFinite(controlRoll) ? Math.max(0, Math.min(1, controlRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.leadControlBonusPercent / maxBonus) * 20;
        const leadControlScore = Math.max(0, Math.min(100, Math.round(
            (safeControlRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((leadControlScore / 100) * 0.4); // 0.8 to 1.2x

        const finalTetherBonus = Math.max(0, Math.min(100, Math.round(recipe.baseTetherSlipMitigationPercent * qualityMultiplier)));
        const finalDocilityBonus = Math.max(0, Math.min(100, Math.round(recipe.baseLeadDocilityBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const halter: CraftedHorseHalter = {
            halterId: `halter_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalTetherSlipMitigationPercent: finalTetherBonus,
            finalLeadDocilityBonusPercent: finalDocilityBonus,
            leadControlPercent: leadControlScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            halter,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans stable muck and maintains horse halter bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveHalterBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveHalterBench; newDurability: number; isFunctional: boolean } {
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
