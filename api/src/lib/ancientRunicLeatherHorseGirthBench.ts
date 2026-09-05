import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Girth Bench, Mithril Roller Buckle & Celestial Valkyrie Ventral Rig Engine for OpenAO MMORPG.
 * Simulates ventral girth strap stitching benches and roller buckle tension rigs (Alder Girth Bench, Runic Maple Cinch Rig, Celestial Void Valkyrie Ventral Sanctum),
 * raw tanned buffalo ventral straps and tempered mithril roller buckle sets (Tanned Buffalo Ventral Strap, Tempered Mithril Roller Buckle Set, Celestial Void Astral Girth Pelt),
 * novice ventral padding girths and sovereign aerial girth recipes (Novice Ventral Padding Girth, Warmaster Mithril Roller Girth, Celestial Void Valkyrie Sovereign Girth),
 * independent steed saddle-looseness mitigation & girth tension ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped saddle looseness mitigation bonus and ventral respiration comfort scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse girth bench maintenance.
 */

export type GirthBenchType = "ALDER_GIRTH_BENCH" | "RUNIC_MAPLE_CINCH_RIG" | "CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM";
export type RawLeatherGirthType = "TANNED_BUFFALO_VENTRAL_STRAP" | "TEMPERED_MITHRIL_ROLLER_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_GIRTH_PELT";
export type GirthRecipeType = "NOVICE_VENTRAL_PADDING_GIRTH" | "WARMASTER_MITHRIL_ROLLER_GIRTH" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH";

export interface GirthBenchData {
    benchType: GirthBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    girthTensionBonusPercent: number;
}

export interface GirthRecipeData {
    recipeType: GirthRecipeType;
    requiredLeatherType: RawLeatherGirthType;
    requiredLeatherCount: number;
    baseSaddleLoosenessMitigationPercent: number;
    baseVentralRespirationComfortBonusPercent: number;
}

export interface ActiveGirthBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: GirthBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseGirth {
    girthId: string;
    recipeType: GirthRecipeType;
    finalSaddleLoosenessMitigationPercent: number;
    finalVentralRespirationComfortBonusPercent: number;
    girthTensionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherGirthType;
    remainingProvidedLeathers: RawLeatherGirthType[];
    craftedEpochMs: number;
}

export const GIRTH_BENCH_CATALOG: Record<GirthBenchType, GirthBenchData> = {
    ALDER_GIRTH_BENCH: { benchType: "ALDER_GIRTH_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, girthTensionBonusPercent: 14 },
    RUNIC_MAPLE_CINCH_RIG: { benchType: "RUNIC_MAPLE_CINCH_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, girthTensionBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_VENTRAL_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, girthTensionBonusPercent: 40 },
};

export const GIRTH_RECIPE_CATALOG: Record<GirthRecipeType, GirthRecipeData> = {
    NOVICE_VENTRAL_PADDING_GIRTH: { recipeType: "NOVICE_VENTRAL_PADDING_GIRTH", requiredLeatherType: "TANNED_BUFFALO_VENTRAL_STRAP", requiredLeatherCount: 2, baseSaddleLoosenessMitigationPercent: 24, baseVentralRespirationComfortBonusPercent: 14 },
    WARMASTER_MITHRIL_ROLLER_GIRTH: { recipeType: "WARMASTER_MITHRIL_ROLLER_GIRTH", requiredLeatherType: "TEMPERED_MITHRIL_ROLLER_BUCKLE_SET", requiredLeatherCount: 2, baseSaddleLoosenessMitigationPercent: 50, baseVentralRespirationComfortBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_GIRTH", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_GIRTH_PELT", requiredLeatherCount: 2, baseSaddleLoosenessMitigationPercent: 84, baseVentralRespirationComfortBonusPercent: 64 },
};

export class AncientRunicLeatherHorseGirthBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(GIRTH_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(GIRTH_BENCH_CATALOG).map(b => b.girthTensionBonusPercent), 1),
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
     * Constructs and initializes a horse girth stitching bench or cinch rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: GirthBenchType
    ): ActiveGirthBench {
        const data = GIRTH_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse girth bench type: ${String(benchType)}`);
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
     * Stitches and tensions ventral straps and tempered mithril roller buckles into horse girths.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftGirth(
        bench: ActiveGirthBench,
        recipeType: GirthRecipeType,
        providedLeathers: RawLeatherGirthType[],
        craftRoll?: number,
        tensionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; girth?: CraftedHorseGirth; updatedBench?: ActiveGirthBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherGirthType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse girth bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = GIRTH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = GIRTH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse girth recipe: ${String(recipeType)}` };
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
                reason: `Insufficient ventral straps/roller buckles: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Ventral strap misaligned: mithril roller buckle distorted during tension clamping, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent girth tension score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeTensionRoll = typeof tensionRoll === "number" && Number.isFinite(tensionRoll) ? Math.max(0, Math.min(1, tensionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.girthTensionBonusPercent / maxBonus) * 20;
        const tensionScore = Math.max(0, Math.min(100, Math.round(
            (safeTensionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((tensionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalLoosenessMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseSaddleLoosenessMitigationPercent * qualityMultiplier)));
        const finalRespirationComfortBonus = Math.max(0, Math.min(100, Math.round(recipe.baseVentralRespirationComfortBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const girth: CraftedHorseGirth = {
            girthId: `girth_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSaddleLoosenessMitigationPercent: finalLoosenessMitigation,
            finalVentralRespirationComfortBonusPercent: finalRespirationComfortBonus,
            girthTensionPercent: tensionScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            girth,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse girth bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveGirthBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveGirthBench; newDurability: number; isFunctional: boolean } {
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
