import crypto from "node:crypto";

/**
 * Ancient Runic Leather War Saddle Bench, Mithril Pommel Cantle & Pegasus Sovereign Rig Engine for OpenAO MMORPG.
 * Simulates cavalry war-saddle stitching benches and pommel cantle shaping rigs (Pine War Saddle Bench, Runic Ironwood Cavalier Rig, Celestial Void Astral Pegasus Sanctum),
 * raw tanned mammoth hide saddle blanks and engraved mithril pommel cantle sets (Tanned Mammoth Hide Saddle Blank, Engraved Mithril Pommel Cantle Set, Celestial Void Starlight Pegasus Leather),
 * novice cavalry treesaddles and celestial sovereign war-saddle recipes (Novice Cavalry Treesaddle, Knight Commander Mithril Cantle Saddle, Celestial Void Pegasus Sovereign War Saddle),
 * independent rider stability & mount endurance ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped rider stability bonus and clamped mount exhaustion mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and war saddle bench maintenance.
 */

export type WarSaddleBenchType = "PINE_WAR_SADDLE_BENCH" | "RUNIC_IRONWOOD_CAVALIER_RIG" | "CELESTIAL_VOID_ASTRAL_PEGASUS_SANCTUM";
export type RawLeatherWarSaddleType = "TANNED_MAMMOTH_HIDE_SADDLE_BLANK" | "ENGRAVED_MITHRIL_POMMEL_CANTLE_SET" | "CELESTIAL_VOID_STARLIGHT_PEGASUS_LEATHER";
export type WarSaddleRecipeType = "NOVICE_CAVALRY_TREESADDLE" | "KNIGHT_COMMANDER_MITHRIL_CANTLE_SADDLE" | "CELESTIAL_VOID_PEGASUS_SOVEREIGN_WAR_SADDLE";

export interface WarSaddleBenchData {
    benchType: WarSaddleBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    stabilityBonusPercent: number;
}

export interface WarSaddleRecipeData {
    recipeType: WarSaddleRecipeType;
    requiredLeatherType: RawLeatherWarSaddleType;
    requiredLeatherCount: number;
    baseRiderStabilityBonusPercent: number;
    baseMountExhaustionMitigationPercent: number;
}

export interface ActiveWarSaddleBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: WarSaddleBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedWarSaddle {
    saddleId: string;
    recipeType: WarSaddleRecipeType;
    finalRiderStabilityBonusPercent: number;
    finalMountExhaustionMitigationPercent: number;
    riderStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherWarSaddleType;
    remainingProvidedLeathers: RawLeatherWarSaddleType[];
    craftedEpochMs: number;
}

export const WAR_SADDLE_BENCH_CATALOG: Record<WarSaddleBenchType, WarSaddleBenchData> = {
    PINE_WAR_SADDLE_BENCH: { benchType: "PINE_WAR_SADDLE_BENCH", maxDurability: 85, leathercraftPower: 25, baseSuccessRatePercent: 85, stabilityBonusPercent: 10 },
    RUNIC_IRONWOOD_CAVALIER_RIG: { benchType: "RUNIC_IRONWOOD_CAVALIER_RIG", maxDurability: 190, leathercraftPower: 65, baseSuccessRatePercent: 92, stabilityBonusPercent: 20 },
    CELESTIAL_VOID_ASTRAL_PEGASUS_SANCTUM: { benchType: "CELESTIAL_VOID_ASTRAL_PEGASUS_SANCTUM", maxDurability: 330, leathercraftPower: 120, baseSuccessRatePercent: 99, stabilityBonusPercent: 35 },
};

export const WAR_SADDLE_RECIPE_CATALOG: Record<WarSaddleRecipeType, WarSaddleRecipeData> = {
    NOVICE_CAVALRY_TREESADDLE: { recipeType: "NOVICE_CAVALRY_TREESADDLE", requiredLeatherType: "TANNED_MAMMOTH_HIDE_SADDLE_BLANK", requiredLeatherCount: 2, baseRiderStabilityBonusPercent: 20, baseMountExhaustionMitigationPercent: 10 },
    KNIGHT_COMMANDER_MITHRIL_CANTLE_SADDLE: { recipeType: "KNIGHT_COMMANDER_MITHRIL_CANTLE_SADDLE", requiredLeatherType: "ENGRAVED_MITHRIL_POMMEL_CANTLE_SET", requiredLeatherCount: 2, baseRiderStabilityBonusPercent: 45, baseMountExhaustionMitigationPercent: 25 },
    CELESTIAL_VOID_PEGASUS_SOVEREIGN_WAR_SADDLE: { recipeType: "CELESTIAL_VOID_PEGASUS_SOVEREIGN_WAR_SADDLE", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_PEGASUS_LEATHER", requiredLeatherCount: 2, baseRiderStabilityBonusPercent: 80, baseMountExhaustionMitigationPercent: 60 },
};

export class AncientRunicLeatherWarSaddleBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(WAR_SADDLE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(WAR_SADDLE_BENCH_CATALOG).map(b => b.stabilityBonusPercent), 1),
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
     * Constructs and initializes a war saddle stitching bench or cavalier rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: WarSaddleBenchType
    ): ActiveWarSaddleBench {
        const data = WAR_SADDLE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported war saddle bench type: ${String(benchType)}`);
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
     * Stitches and rivets mammoth hide saddle blanks and engraved mithril pommels into war saddles.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftSaddle(
        bench: ActiveWarSaddleBench,
        recipeType: WarSaddleRecipeType,
        providedLeathers: RawLeatherWarSaddleType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; saddle?: CraftedWarSaddle; updatedBench?: ActiveWarSaddleBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherWarSaddleType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `War saddle bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = WAR_SADDLE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = WAR_SADDLE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown war saddle recipe: ${String(recipeType)}` };
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
                reason: `Insufficient saddle leather/pommel sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Pommel cantle misaligned: mithril riveting clamp buckled leather saddle tree, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent rider stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.stabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStabilityBonus = Math.max(0, Math.min(100, Math.round(recipe.baseRiderStabilityBonusPercent * qualityMultiplier)));
        const finalExhaustionMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseMountExhaustionMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const saddle: CraftedWarSaddle = {
            saddleId: `saddle_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalRiderStabilityBonusPercent: finalStabilityBonus,
            finalMountExhaustionMitigationPercent: finalExhaustionMitigate,
            riderStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            saddle,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian saddle wax and maintains war saddle bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveWarSaddleBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveWarSaddleBench; newDurability: number; isFunctional: boolean } {
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