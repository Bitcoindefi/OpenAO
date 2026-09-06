import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Cantle Roll Bench, Mithril Buckle Rig & Celestial Valkyrie Cantle Sanctum Engine for OpenAO MMORPG.
 * Simulates cantle bedroll stitching benches and lumbar support tension rigs (Elder Cantle Roll Bench, Runic Oak Cantle Roll Rig, Celestial Void Valkyrie Cantle Sanctum),
 * raw tanned buffalo cantle roll straps and tempered mithril cantle buckle sets (Tanned Buffalo Cantle Roll Strap, Tempered Mithril Cantle Buckle Set, Celestial Void Astral Cantle Pelt),
 * novice expedition cantle rolls and sovereign aerial cantle roll recipes (Novice Expedition Cantle Roll, Warmaster Mithril Buckled Cantle Roll, Celestial Void Valkyrie Sovereign Cantle Roll),
 * independent steed bedroll-storage capacity ratings and lumbar support ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped bedroll storage capacity bonus and lumbar support scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse cantle roll bench maintenance.
 */

export type CantleRollBenchType = "ELDER_CANTLE_ROLL_BENCH" | "RUNIC_OAK_CANTLE_ROLL_RIG" | "CELESTIAL_VOID_VALKYRIE_CANTLE_SANCTUM";
export type RawLeatherCantleRollType = "TANNED_BUFFALO_CANTLE_ROLL_STRAP" | "TEMPERED_MITHRIL_CANTLE_BUCKLE_SET" | "CELESTIAL_VOID_ASTRAL_CANTLE_PELT";
export type CantleRollRecipeType = "NOVICE_EXPEDITION_CANTLE_ROLL" | "WARMASTER_MITHRIL_BUCKLED_CANTLE_ROLL" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CANTLE_ROLL";

export interface CantleRollBenchData {
    benchType: CantleRollBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    cantleAnchorStabilityBonusPercent: number;
}

export interface CantleRollRecipeData {
    recipeType: CantleRollRecipeType;
    requiredLeatherType: RawLeatherCantleRollType;
    requiredLeatherCount: number;
    baseBedrollStorageCapacityPercent: number;
    baseLumbarSupportBonusPercent: number;
}

export interface ActiveCantleRollBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CantleRollBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCantleRoll {
    cantleRollId: string;
    recipeType: CantleRollRecipeType;
    finalBedrollStorageCapacityPercent: number;
    finalLumbarSupportBonusPercent: number;
    cantleAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCantleRollType;
    remainingProvidedLeathers: RawLeatherCantleRollType[];
    craftedEpochMs: number;
}

export const CANTLE_ROLL_BENCH_CATALOG: Record<CantleRollBenchType, CantleRollBenchData> = {
    ELDER_CANTLE_ROLL_BENCH: { benchType: "ELDER_CANTLE_ROLL_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, cantleAnchorStabilityBonusPercent: 14 },
    RUNIC_OAK_CANTLE_ROLL_RIG: { benchType: "RUNIC_OAK_CANTLE_ROLL_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, cantleAnchorStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CANTLE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CANTLE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, cantleAnchorStabilityBonusPercent: 40 },
};

export const CANTLE_ROLL_RECIPE_CATALOG: Record<CantleRollRecipeType, CantleRollRecipeData> = {
    NOVICE_EXPEDITION_CANTLE_ROLL: { recipeType: "NOVICE_EXPEDITION_CANTLE_ROLL", requiredLeatherType: "TANNED_BUFFALO_CANTLE_ROLL_STRAP", requiredLeatherCount: 2, baseBedrollStorageCapacityPercent: 24, baseLumbarSupportBonusPercent: 14 },
    WARMASTER_MITHRIL_BUCKLED_CANTLE_ROLL: { recipeType: "WARMASTER_MITHRIL_BUCKLED_CANTLE_ROLL", requiredLeatherType: "TEMPERED_MITHRIL_CANTLE_BUCKLE_SET", requiredLeatherCount: 2, baseBedrollStorageCapacityPercent: 50, baseLumbarSupportBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CANTLE_ROLL: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CANTLE_ROLL", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CANTLE_PELT", requiredLeatherCount: 2, baseBedrollStorageCapacityPercent: 84, baseLumbarSupportBonusPercent: 64 },
};

export class AncientRunicLeatherHorseCantleRollBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CANTLE_ROLL_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CANTLE_ROLL_BENCH_CATALOG).map(b => b.cantleAnchorStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse cantle roll stitching bench or buckle rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CantleRollBenchType
    ): ActiveCantleRollBench {
        const data = CANTLE_ROLL_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse cantle roll bench type: ${String(benchType)}`);
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
     * Stitches and tensions cantle roll straps and tempered mithril buckle sets into horse cantle rolls.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCantleRoll(
        bench: ActiveCantleRollBench,
        recipeType: CantleRollRecipeType,
        providedLeathers: RawLeatherCantleRollType[],
        craftRoll?: number,
        anchorRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; cantleRoll?: CraftedHorseCantleRoll; updatedBench?: ActiveCantleRollBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCantleRollType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse cantle roll bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CANTLE_ROLL_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CANTLE_ROLL_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse cantle roll recipe: ${String(recipeType)}` };
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
                reason: `Insufficient cantle roll straps/buckle sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Cantle roll strap misaligned: mithril buckle frame distorted under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent cantle anchor score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeAnchorRoll = typeof anchorRoll === "number" && Number.isFinite(anchorRoll) ? Math.max(0, Math.min(1, anchorRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.cantleAnchorStabilityBonusPercent / maxBonus) * 20;
        const anchorScore = Math.max(0, Math.min(100, Math.round(
            (safeAnchorRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((anchorScore / 100) * 0.4); // 0.8 to 1.2x

        const finalStorage = Math.max(0, Math.min(100, Math.round(recipe.baseBedrollStorageCapacityPercent * qualityMultiplier)));
        const finalLumbar = Math.max(0, Math.min(100, Math.round(recipe.baseLumbarSupportBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const cantleRoll: CraftedHorseCantleRoll = {
            cantleRollId: `cantleroll_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalBedrollStorageCapacityPercent: finalStorage,
            finalLumbarSupportBonusPercent: finalLumbar,
            cantleAnchorStabilityPercent: anchorScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            cantleRoll,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse cantle roll bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCantleRollBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCantleRollBench; newDurability: number; isFunctional: boolean } {
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
