import crypto from "node:crypto";

/**
 * Ancient Runic Leather Shield Strapping Bench, Iron Rivet Buckle & Arcane Aegis Harness Engine for OpenAO MMORPG.
 * Simulates shield strapping benches and rivet clinching anvils (Oak Shield Strapping Bench, Runic Ironwood Aegis Harness Rig, Celestial Void Seraphic Bulwark Sanctum),
 * raw tanned bullhide enarme straps and tempered steel buckle plates (Tanned Bullhide Enarme Strap, Tempered Steel Buckle Plate, Celestial Void Starlight Aegis Leather),
 * fast-pivot buckler straps and seraphic bulwark harness recipes (Skirmisher Fast-Pivot Buckler Strap, Guardian Heavy Tower Shield Enarme, Celestial Void Seraphic Bulwark Harness),
 * independent shield arm poise recovery ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped block poise recovery and clamped shield break stamina mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and shield bench maintenance.
 */

export type ShieldBenchType = "OAK_SHIELD_STRAPPING_BENCH" | "RUNIC_IRONWOOD_AEGIS_HARNESS_RIG" | "CELESTIAL_VOID_SERAPHIC_BULWARK_SANCTUM";
export type RawLeatherShieldType = "TANNED_BULLHIDE_ENARME_STRAP" | "TEMPERED_STEEL_BUCKLE_PLATE" | "CELESTIAL_VOID_STARLIGHT_AEGIS_LEATHER";
export type ShieldHarnessRecipeType = "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP" | "GUARDIAN_HEAVY_TOWER_SHIELD_ENARME" | "CELESTIAL_VOID_SERAPHIC_BULWARK_HARNESS";

export interface ShieldBenchData {
    benchType: ShieldBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    poiseBonusPercent: number;
}

export interface ShieldHarnessRecipeData {
    recipeType: ShieldHarnessRecipeType;
    requiredLeatherType: RawLeatherShieldType;
    requiredLeatherCount: number;
    baseBlockPoiseRecoveryPercent: number;
    baseShieldBreakStaminaMitigationPercent: number;
}

export interface ActiveShieldBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: ShieldBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedShieldHarness {
    harnessId: string;
    recipeType: ShieldHarnessRecipeType;
    finalBlockPoiseRecoveryPercent: number;
    finalShieldBreakStaminaMitigationPercent: number;
    poiseRecoveryFluidityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherShieldType;
    remainingProvidedLeathers: RawLeatherShieldType[];
    craftedEpochMs: number;
}

export const SHIELD_BENCH_CATALOG: Record<ShieldBenchType, ShieldBenchData> = {
    OAK_SHIELD_STRAPPING_BENCH: { benchType: "OAK_SHIELD_STRAPPING_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, poiseBonusPercent: 10 },
    RUNIC_IRONWOOD_AEGIS_HARNESS_RIG: { benchType: "RUNIC_IRONWOOD_AEGIS_HARNESS_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, poiseBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_BULWARK_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_BULWARK_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, poiseBonusPercent: 35 },
};

export const SHIELD_RECIPE_CATALOG: Record<ShieldHarnessRecipeType, ShieldHarnessRecipeData> = {
    SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP: { recipeType: "SKIRMISHER_FAST_PIVOT_BUCKLER_STRAP", requiredLeatherType: "TANNED_BULLHIDE_ENARME_STRAP", requiredLeatherCount: 2, baseBlockPoiseRecoveryPercent: 20, baseShieldBreakStaminaMitigationPercent: 10 },
    GUARDIAN_HEAVY_TOWER_SHIELD_ENARME: { recipeType: "GUARDIAN_HEAVY_TOWER_SHIELD_ENARME", requiredLeatherType: "TEMPERED_STEEL_BUCKLE_PLATE", requiredLeatherCount: 2, baseBlockPoiseRecoveryPercent: 45, baseShieldBreakStaminaMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_BULWARK_HARNESS: { recipeType: "CELESTIAL_VOID_SERAPHIC_BULWARK_HARNESS", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_AEGIS_LEATHER", requiredLeatherCount: 2, baseBlockPoiseRecoveryPercent: 80, baseShieldBreakStaminaMitigationPercent: 60 },
};

export class AncientRunicLeatherShieldStrappingBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SHIELD_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SHIELD_BENCH_CATALOG).map(b => b.poiseBonusPercent), 1),
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
     * Constructs and initializes a shield strapping bench or aegis harness rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: ShieldBenchType
    ): ActiveShieldBench {
        const data = SHIELD_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported shield bench type: ${String(benchType)}`);
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
     * Rivets and straps bullhide enarmes and steel buckles into combat shield harnesses.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftShieldStrap(
        bench: ActiveShieldBench,
        recipeType: ShieldHarnessRecipeType,
        providedLeathers: RawLeatherShieldType[],
        craftRoll?: number,
        poiseRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; harness?: CraftedShieldHarness; updatedBench?: ActiveShieldBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherShieldType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Shield strapping bench is cracked or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SHIELD_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SHIELD_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown shield recipe: ${String(recipeType)}` };
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
                reason: `Insufficient shield leather: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Enarme severed: rivet clincher punch sheared bullhide strap, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent poise recovery score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safePoiseRoll = typeof poiseRoll === "number" && Number.isFinite(poiseRoll) ? Math.max(0, Math.min(1, poiseRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.poiseBonusPercent / maxBonus) * 20;
        const poiseScore = Math.max(0, Math.min(100, Math.round(
            (safePoiseRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((poiseScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRecovery = Math.max(0, Math.min(100, Math.round(recipe.baseBlockPoiseRecoveryPercent * qualityMultiplier)));
        const finalMitigation = Math.max(0, Math.min(100, Math.round(recipe.baseShieldBreakStaminaMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const harness: CraftedShieldHarness = {
            harnessId: `harness_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalBlockPoiseRecoveryPercent: finalRecovery,
            finalShieldBreakStaminaMitigationPercent: finalMitigation,
            poiseRecoveryFluidityPercent: poiseScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            harness,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-tightens rivet clincher jaws and maintains shield strapping bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveShieldBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveShieldBench; newDurability: number; isFunctional: boolean } {
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