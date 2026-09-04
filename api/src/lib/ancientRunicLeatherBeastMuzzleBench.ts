import crypto from "node:crypto";

/**
 * Ancient Runic Leather Beast Muzzle Bench, Adamantine Spike Rivet & War-Hound Harness Engine for OpenAO MMORPG.
 * Simulates beast muzzle stitching benches and war-hound harness riveting anvils (Oak Beast Muzzle Bench, Runic Ironwood Beastmaster Rig, Celestial Void Seraphic Apex Sanctum),
 * raw tanned direwolf hide muzzle blanks and adamantine spike riveted ring sets (Tanned Direwolf Hide Muzzle Blank, Adamantine Spike Riveted Ring Set, Celestial Void Starlight Apex Beast Leather),
 * hound training restraint muzzles and seraphic apex frenzy collar recipes (Hound Training Restraint Muzzle, War-Beast Spiked Battle Harness, Celestial Void Seraphic Apex Frenzy Collar),
 * independent feral bite suppression & beast taming obedience ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped companion bite puncture bonus and clamped companion wild frenzy disobedience mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and beast muzzle bench maintenance.
 */

export type BeastMuzzleBenchType = "OAK_BEAST_MUZZLE_BENCH" | "RUNIC_IRONWOOD_BEASTMASTER_RIG" | "CELESTIAL_VOID_SERAPHIC_APEX_SANCTUM";
export type RawLeatherBeastMuzzleType = "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK" | "ADAMANTINE_SPIKE_RIVETED_RING_SET" | "CELESTIAL_VOID_STARLIGHT_APEX_BEAST_LEATHER";
export type BeastMuzzleRecipeType = "HOUND_TRAINING_RESTRAINT_MUZZLE" | "WAR_BEAST_SPIKED_BATTLE_HARNESS" | "CELESTIAL_VOID_SERAPHIC_APEX_FRENZY_COLLAR";

export interface BeastMuzzleBenchData {
    benchType: BeastMuzzleBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    restraintBonusPercent: number;
}

export interface BeastMuzzleRecipeData {
    recipeType: BeastMuzzleRecipeType;
    requiredLeatherType: RawLeatherBeastMuzzleType;
    requiredLeatherCount: number;
    baseCompanionBitePunctureBonusPercent: number;
    baseCompanionWildFrenzyMitigationPercent: number;
}

export interface ActiveBeastMuzzleBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BeastMuzzleBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedBeastMuzzle {
    muzzleId: string;
    recipeType: BeastMuzzleRecipeType;
    finalCompanionBitePunctureBonusPercent: number;
    finalCompanionWildFrenzyMitigationPercent: number;
    feralBiteSuppressionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBeastMuzzleType;
    remainingProvidedLeathers: RawLeatherBeastMuzzleType[];
    craftedEpochMs: number;
}

export const BEAST_MUZZLE_BENCH_CATALOG: Record<BeastMuzzleBenchType, BeastMuzzleBenchData> = {
    OAK_BEAST_MUZZLE_BENCH: { benchType: "OAK_BEAST_MUZZLE_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, restraintBonusPercent: 10 },
    RUNIC_IRONWOOD_BEASTMASTER_RIG: { benchType: "RUNIC_IRONWOOD_BEASTMASTER_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, restraintBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_APEX_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_APEX_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, restraintBonusPercent: 35 },
};

export const BEAST_MUZZLE_RECIPE_CATALOG: Record<BeastMuzzleRecipeType, BeastMuzzleRecipeData> = {
    HOUND_TRAINING_RESTRAINT_MUZZLE: { recipeType: "HOUND_TRAINING_RESTRAINT_MUZZLE", requiredLeatherType: "TANNED_DIREWOLF_HIDE_MUZZLE_BLANK", requiredLeatherCount: 2, baseCompanionBitePunctureBonusPercent: 20, baseCompanionWildFrenzyMitigationPercent: 10 },
    WAR_BEAST_SPIKED_BATTLE_HARNESS: { recipeType: "WAR_BEAST_SPIKED_BATTLE_HARNESS", requiredLeatherType: "ADAMANTINE_SPIKE_RIVETED_RING_SET", requiredLeatherCount: 2, baseCompanionBitePunctureBonusPercent: 45, baseCompanionWildFrenzyMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_APEX_FRENZY_COLLAR: { recipeType: "CELESTIAL_VOID_SERAPHIC_APEX_FRENZY_COLLAR", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_APEX_BEAST_LEATHER", requiredLeatherCount: 2, baseCompanionBitePunctureBonusPercent: 80, baseCompanionWildFrenzyMitigationPercent: 60 },
};

export class AncientRunicLeatherBeastMuzzleBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BEAST_MUZZLE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BEAST_MUZZLE_BENCH_CATALOG).map(b => b.restraintBonusPercent), 1),
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
     * Constructs and initializes a beast muzzle stitching bench or beastmaster rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BeastMuzzleBenchType
    ): ActiveBeastMuzzleBench {
        const data = BEAST_MUZZLE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported beast muzzle bench type: ${String(benchType)}`);
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
     * Stitches and rivets direwolf hide blanks and adamantine spikes into beast muzzles and war-harnesses.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftMuzzle(
        bench: ActiveBeastMuzzleBench,
        recipeType: BeastMuzzleRecipeType,
        providedLeathers: RawLeatherBeastMuzzleType[],
        craftRoll?: number,
        suppressionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; muzzle?: CraftedBeastMuzzle; updatedBench?: ActiveBeastMuzzleBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBeastMuzzleType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Beast muzzle bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BEAST_MUZZLE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BEAST_MUZZLE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown beast muzzle recipe: ${String(recipeType)}` };
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
                reason: `Insufficient beast muzzle leather/spikes: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Jaw strap sheared: adamantine spike rivet punch snapped direwolf muzzle jaw strap, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent feral bite suppression score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSuppressionRoll = typeof suppressionRoll === "number" && Number.isFinite(suppressionRoll) ? Math.max(0, Math.min(1, suppressionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.restraintBonusPercent / maxBonus) * 20;
        const suppressionScore = Math.max(0, Math.min(100, Math.round(
            (safeSuppressionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((suppressionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalBiteBonus = Math.max(0, Math.min(100, Math.round(recipe.baseCompanionBitePunctureBonusPercent * qualityMultiplier)));
        const finalFrenzyMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseCompanionWildFrenzyMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const muzzle: CraftedBeastMuzzle = {
            muzzleId: `muzzle_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalCompanionBitePunctureBonusPercent: finalBiteBonus,
            finalCompanionWildFrenzyMitigationPercent: finalFrenzyMitigate,
            feralBiteSuppressionPercent: suppressionScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            muzzle,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Tightens adamantine rivet dies and maintains beast muzzle bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveBeastMuzzleBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveBeastMuzzleBench; newDurability: number; isFunctional: boolean } {
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