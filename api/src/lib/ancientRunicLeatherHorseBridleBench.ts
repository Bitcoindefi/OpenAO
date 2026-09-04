import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Bridle Bench, Mithril Bit Snaffle & War-Steed Headstall Engine for OpenAO MMORPG.
 * Simulates equestrian harness stitching benches and war-steed headstall shaping blocks (Hardwood Stable Bridle Bench, Runic Ironwood Equestrian Rig, Celestial Void Celestial Chariot Sanctum),
 * raw tanned warsteed bridle leather straps and tempered mithril bit snaffle sets (Tanned Warsteed Bridle Leather Strap, Tempered Mithril Bit Snaffle Set, Celestial Void Starlight Headstall Leather),
 * novice cavalry snaffle bridles and celestial sovereign headstall recipes (Novice Cavalry Snaffle Bridle, Veteran Knight Mithril Curb Bridle, Celestial Void Warsteed Sovereign Headstall),
 * independent equine control & responsiveness ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped steed turn responsiveness bonus and clamped steed panic tension mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse bridle bench maintenance.
 */

export type HorseBridleBenchType = "HARDWOOD_STABLE_BRIDLE_BENCH" | "RUNIC_IRONWOOD_EQUESTRIAN_RIG" | "CELESTIAL_VOID_CELESTIAL_CHARIOT_SANCTUM";
export type RawLeatherHorseBridleType = "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP" | "TEMPERED_MITHRIL_BIT_SNAFFLE_SET" | "CELESTIAL_VOID_STARLIGHT_HEADSTALL_LEATHER";
export type HorseBridleRecipeType = "NOVICE_CAVALRY_SNAFFLE_BRIDLE" | "VETERAN_KNIGHT_MITHRIL_CURB_BRIDLE" | "CELESTIAL_VOID_WARSTEED_SOVEREIGN_HEADSTALL";

export interface HorseBridleBenchData {
    benchType: HorseBridleBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    controlBonusPercent: number;
}

export interface HorseBridleRecipeData {
    recipeType: HorseBridleRecipeType;
    requiredLeatherType: RawLeatherHorseBridleType;
    requiredLeatherCount: number;
    baseSteedTurnResponsivenessBonusPercent: number;
    baseSteedPanicTensionMitigationPercent: number;
}

export interface ActiveHorseBridleBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: HorseBridleBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseBridle {
    bridleId: string;
    recipeType: HorseBridleRecipeType;
    finalSteedTurnResponsivenessBonusPercent: number;
    finalSteedPanicTensionMitigationPercent: number;
    equineControlPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherHorseBridleType;
    remainingProvidedLeathers: RawLeatherHorseBridleType[];
    craftedEpochMs: number;
}

export const HORSE_BRIDLE_BENCH_CATALOG: Record<HorseBridleBenchType, HorseBridleBenchData> = {
    HARDWOOD_STABLE_BRIDLE_BENCH: { benchType: "HARDWOOD_STABLE_BRIDLE_BENCH", maxDurability: 80, leathercraftPower: 25, baseSuccessRatePercent: 85, controlBonusPercent: 10 },
    RUNIC_IRONWOOD_EQUESTRIAN_RIG: { benchType: "RUNIC_IRONWOOD_EQUESTRIAN_RIG", maxDurability: 180, leathercraftPower: 65, baseSuccessRatePercent: 92, controlBonusPercent: 20 },
    CELESTIAL_VOID_CELESTIAL_CHARIOT_SANCTUM: { benchType: "CELESTIAL_VOID_CELESTIAL_CHARIOT_SANCTUM", maxDurability: 320, leathercraftPower: 120, baseSuccessRatePercent: 99, controlBonusPercent: 35 },
};

export const HORSE_BRIDLE_RECIPE_CATALOG: Record<HorseBridleRecipeType, HorseBridleRecipeData> = {
    NOVICE_CAVALRY_SNAFFLE_BRIDLE: { recipeType: "NOVICE_CAVALRY_SNAFFLE_BRIDLE", requiredLeatherType: "TANNED_WARSTEED_BRIDLE_LEATHER_STRAP", requiredLeatherCount: 2, baseSteedTurnResponsivenessBonusPercent: 20, baseSteedPanicTensionMitigationPercent: 10 },
    VETERAN_KNIGHT_MITHRIL_CURB_BRIDLE: { recipeType: "VETERAN_KNIGHT_MITHRIL_CURB_BRIDLE", requiredLeatherType: "TEMPERED_MITHRIL_BIT_SNAFFLE_SET", requiredLeatherCount: 2, baseSteedTurnResponsivenessBonusPercent: 45, baseSteedPanicTensionMitigationPercent: 25 },
    CELESTIAL_VOID_WARSTEED_SOVEREIGN_HEADSTALL: { recipeType: "CELESTIAL_VOID_WARSTEED_SOVEREIGN_HEADSTALL", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_HEADSTALL_LEATHER", requiredLeatherCount: 2, baseSteedTurnResponsivenessBonusPercent: 80, baseSteedPanicTensionMitigationPercent: 60 },
};

export class AncientRunicLeatherHorseBridleBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(HORSE_BRIDLE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(HORSE_BRIDLE_BENCH_CATALOG).map(b => b.controlBonusPercent), 1),
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
     * Constructs and initializes a horse bridle stitching bench or equestrian rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: HorseBridleBenchType
    ): ActiveHorseBridleBench {
        const data = HORSE_BRIDLE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse bridle bench type: ${String(benchType)}`);
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
     * Stitches and rivets war-steed bridle straps and mithril bit snaffles into horse bridles.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftBridle(
        bench: ActiveHorseBridleBench,
        recipeType: HorseBridleRecipeType,
        providedLeathers: RawLeatherHorseBridleType[],
        craftRoll?: number,
        controlRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; bridle?: CraftedHorseBridle; updatedBench?: ActiveHorseBridleBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherHorseBridleType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse bridle bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = HORSE_BRIDLE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = HORSE_BRIDLE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse bridle recipe: ${String(recipeType)}` };
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
                reason: `Insufficient bridle leather/snaffle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Snaffle bit misaligned: mithril curb cheekpiece warped leather headstall strap, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent equine control score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeControlRoll = typeof controlRoll === "number" && Number.isFinite(controlRoll) ? Math.max(0, Math.min(1, controlRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.controlBonusPercent / maxBonus) * 20;
        const controlScore = Math.max(0, Math.min(100, Math.round(
            (safeControlRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((controlScore / 100) * 0.4); // 0.8 to 1.2x

        const finalTurnBonus = Math.max(0, Math.min(100, Math.round(recipe.baseSteedTurnResponsivenessBonusPercent * qualityMultiplier)));
        const finalPanicMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseSteedPanicTensionMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const bridle: CraftedHorseBridle = {
            bridleId: `bridle_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSteedTurnResponsivenessBonusPercent: finalTurnBonus,
            finalSteedPanicTensionMitigationPercent: finalPanicMitigate,
            equineControlPercent: controlScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            bridle,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian grit and maintains horse bridle bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveHorseBridleBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveHorseBridleBench; newDurability: number; isFunctional: boolean } {
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