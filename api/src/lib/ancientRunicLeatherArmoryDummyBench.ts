import crypto from "node:crypto";

/**
 * Ancient Runic Leather Armory Dummy Bench, Straw Core Stuffer & Sparring Target Engine for OpenAO MMORPG.
 * Simulates armory dummy stitching benches and target core stuffers (Oak Armory Dummy Bench, Runic Ironwood Sparring Rig, Celestial Void Seraphic Automaton Sanctum),
 * raw tanned horsehide dummy skins and enchanted straw core bundles (Tanned Horsehide Dummy Skin, Enchanted Straw Core Bundle, Celestial Void Starlight Training Leather),
 * straw-filled novice targets and seraphic dynamic automaton recipes (Novice Straw-Filled Target Dummy, Veteran Iron-Reinforced Sparring Dummy, Celestial Void Seraphic Dynamic Automaton),
 * independent weapon rebound & impact resilience ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped training XP gain multiplier and clamped weapon wear mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and dummy bench maintenance.
 */

export type DummyBenchType = "OAK_ARMORY_DUMMY_BENCH" | "RUNIC_IRONWOOD_SPARRING_RIG" | "CELESTIAL_VOID_SERAPHIC_AUTOMATON_SANCTUM";
export type RawLeatherDummyType = "TANNED_HORSEHIDE_DUMMY_SKIN" | "ENCHANTED_STRAW_CORE_BUNDLE" | "CELESTIAL_VOID_STARLIGHT_TRAINING_LEATHER";
export type TrainingDummyRecipeType = "NOVICE_STRAW_FILLED_TARGET_DUMMY" | "VETERAN_IRON_REINFORCED_SPARRING_DUMMY" | "CELESTIAL_VOID_SERAPHIC_DYNAMIC_AUTOMATON";

export interface DummyBenchData {
    benchType: DummyBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    reboundBonusPercent: number;
}

export interface TrainingDummyRecipeData {
    recipeType: TrainingDummyRecipeType;
    requiredLeatherType: RawLeatherDummyType;
    requiredLeatherCount: number;
    baseTrainingXPMultiplierPercent: number;
    baseWeaponWearMitigationPercent: number;
}

export interface ActiveDummyBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: DummyBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedTrainingDummy {
    dummyId: string;
    recipeType: TrainingDummyRecipeType;
    finalTrainingXPMultiplierPercent: number;
    finalWeaponWearMitigationPercent: number;
    impactResiliencePercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherDummyType;
    remainingProvidedLeathers: RawLeatherDummyType[];
    craftedEpochMs: number;
}

export const DUMMY_BENCH_CATALOG: Record<DummyBenchType, DummyBenchData> = {
    OAK_ARMORY_DUMMY_BENCH: { benchType: "OAK_ARMORY_DUMMY_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, reboundBonusPercent: 10 },
    RUNIC_IRONWOOD_SPARRING_RIG: { benchType: "RUNIC_IRONWOOD_SPARRING_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, reboundBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_AUTOMATON_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_AUTOMATON_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, reboundBonusPercent: 35 },
};

export const DUMMY_RECIPE_CATALOG: Record<TrainingDummyRecipeType, TrainingDummyRecipeData> = {
    NOVICE_STRAW_FILLED_TARGET_DUMMY: { recipeType: "NOVICE_STRAW_FILLED_TARGET_DUMMY", requiredLeatherType: "TANNED_HORSEHIDE_DUMMY_SKIN", requiredLeatherCount: 2, baseTrainingXPMultiplierPercent: 20, baseWeaponWearMitigationPercent: 10 },
    VETERAN_IRON_REINFORCED_SPARRING_DUMMY: { recipeType: "VETERAN_IRON_REINFORCED_SPARRING_DUMMY", requiredLeatherType: "ENCHANTED_STRAW_CORE_BUNDLE", requiredLeatherCount: 2, baseTrainingXPMultiplierPercent: 45, baseWeaponWearMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_DYNAMIC_AUTOMATON: { recipeType: "CELESTIAL_VOID_SERAPHIC_DYNAMIC_AUTOMATON", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_TRAINING_LEATHER", requiredLeatherCount: 2, baseTrainingXPMultiplierPercent: 80, baseWeaponWearMitigationPercent: 60 },
};

export class AncientRunicLeatherArmoryDummyBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(DUMMY_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(DUMMY_BENCH_CATALOG).map(b => b.reboundBonusPercent), 1),
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
     * Constructs and initializes an armory dummy stitching bench or sparring rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: DummyBenchType
    ): ActiveDummyBench {
        const data = DUMMY_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported dummy bench type: ${String(benchType)}`);
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
     * Stitches and stuffs horsehide dummy skins and straw bundles into training automata.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftDummy(
        bench: ActiveDummyBench,
        recipeType: TrainingDummyRecipeType,
        providedLeathers: RawLeatherDummyType[],
        craftRoll?: number,
        resilienceRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; dummy?: CraftedTrainingDummy; updatedBench?: ActiveDummyBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherDummyType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Armory dummy bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = DUMMY_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = DUMMY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown dummy recipe: ${String(recipeType)}` };
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
                reason: `Insufficient dummy leather/stuffing: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Skin burst: straw stuffing rammer ruptured horsehide seam, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent impact resilience score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeResilienceRoll = typeof resilienceRoll === "number" && Number.isFinite(resilienceRoll) ? Math.max(0, Math.min(1, resilienceRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.reboundBonusPercent / maxBonus) * 20;
        const resilienceScore = Math.max(0, Math.min(100, Math.round(
            (safeResilienceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((resilienceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalXPMultiplier = Math.max(0, Math.min(100, Math.round(recipe.baseTrainingXPMultiplierPercent * qualityMultiplier)));
        const finalWearMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseWeaponWearMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const dummy: CraftedTrainingDummy = {
            dummyId: `dummy_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalTrainingXPMultiplierPercent: finalXPMultiplier,
            finalWeaponWearMitigationPercent: finalWearMitigation,
            impactResiliencePercent: resilienceScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            dummy,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-pads core stuffing jaws and maintains armory dummy bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveDummyBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveDummyBench; newDurability: number; isFunctional: boolean } {
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