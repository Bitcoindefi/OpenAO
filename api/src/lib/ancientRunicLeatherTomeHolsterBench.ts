import crypto from "node:crypto";

/**
 * Ancient Runic Leather Tome Holster Bench, Enchanted Silver Buckle & Spellbook Scabbard Engine for OpenAO MMORPG.
 * Simulates tome holster stitching benches and spellbook scabbard framing anvils (Oak Tome Holster Bench, Runic Ironwood Arcanist Rig, Celestial Void Seraphic Archmage Sanctum),
 * raw tanned basilisk parchment holster blanks and enchanted silver buckle clasp sets (Tanned Basilisk Parchment Holster Blank, Enchanted Silver Buckle Clasp Set, Celestial Void Starlight Archmage Leather),
 * apprentice grimoire hip holsters and seraphic chronomantic grimoire harness recipes (Apprentice Grimoire Hip Holster, Battlemage Quick-Cast Tome Scabbard, Celestial Void Seraphic Chronomantic Grimoire Harness),
 * independent spellbook drawing speed & moisture sealing ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped spell cast acceleration bonus and clamped arcane mana exhaustion mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and tome holster bench maintenance.
 */

export type TomeHolsterBenchType = "OAK_TOME_HOLSTER_BENCH" | "RUNIC_IRONWOOD_ARCANIST_RIG" | "CELESTIAL_VOID_SERAPHIC_ARCHMAGE_SANCTUM";
export type RawLeatherTomeHolsterType = "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK" | "ENCHANTED_SILVER_BUCKLE_CLASP_SET" | "CELESTIAL_VOID_STARLIGHT_ARCHMAGE_LEATHER";
export type TomeHolsterRecipeType = "APPRENTICE_GRIMOIRE_HIP_HOLSTER" | "BATTLEMAGE_QUICK_CAST_TOME_SCABBARD" | "CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_GRIMOIRE_HARNESS";

export interface TomeHolsterBenchData {
    benchType: TomeHolsterBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    fastcastBonusPercent: number;
}

export interface TomeHolsterRecipeData {
    recipeType: TomeHolsterRecipeType;
    requiredLeatherType: RawLeatherTomeHolsterType;
    requiredLeatherCount: number;
    baseSpellCastAccelerationBonusPercent: number;
    baseArcaneManaExhaustionMitigationPercent: number;
}

export interface ActiveTomeHolsterBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: TomeHolsterBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedTomeHolster {
    holsterId: string;
    recipeType: TomeHolsterRecipeType;
    finalSpellCastAccelerationBonusPercent: number;
    finalArcaneManaExhaustionMitigationPercent: number;
    spellbookDrawingSpeedPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherTomeHolsterType;
    remainingProvidedLeathers: RawLeatherTomeHolsterType[];
    craftedEpochMs: number;
}

export const TOME_HOLSTER_BENCH_CATALOG: Record<TomeHolsterBenchType, TomeHolsterBenchData> = {
    OAK_TOME_HOLSTER_BENCH: { benchType: "OAK_TOME_HOLSTER_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, fastcastBonusPercent: 10 },
    RUNIC_IRONWOOD_ARCANIST_RIG: { benchType: "RUNIC_IRONWOOD_ARCANIST_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, fastcastBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_ARCHMAGE_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_ARCHMAGE_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, fastcastBonusPercent: 35 },
};

export const TOME_HOLSTER_RECIPE_CATALOG: Record<TomeHolsterRecipeType, TomeHolsterRecipeData> = {
    APPRENTICE_GRIMOIRE_HIP_HOLSTER: { recipeType: "APPRENTICE_GRIMOIRE_HIP_HOLSTER", requiredLeatherType: "TANNED_BASILISK_PARCHMENT_HOLSTER_BLANK", requiredLeatherCount: 2, baseSpellCastAccelerationBonusPercent: 20, baseArcaneManaExhaustionMitigationPercent: 10 },
    BATTLEMAGE_QUICK_CAST_TOME_SCABBARD: { recipeType: "BATTLEMAGE_QUICK_CAST_TOME_SCABBARD", requiredLeatherType: "ENCHANTED_SILVER_BUCKLE_CLASP_SET", requiredLeatherCount: 2, baseSpellCastAccelerationBonusPercent: 45, baseArcaneManaExhaustionMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_GRIMOIRE_HARNESS: { recipeType: "CELESTIAL_VOID_SERAPHIC_CHRONOMANTIC_GRIMOIRE_HARNESS", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_ARCHMAGE_LEATHER", requiredLeatherCount: 2, baseSpellCastAccelerationBonusPercent: 80, baseArcaneManaExhaustionMitigationPercent: 60 },
};

export class AncientRunicLeatherTomeHolsterBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(TOME_HOLSTER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(TOME_HOLSTER_BENCH_CATALOG).map(b => b.fastcastBonusPercent), 1),
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
     * Constructs and initializes a tome holster stitching bench or arcanist rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: TomeHolsterBenchType
    ): ActiveTomeHolsterBench {
        const data = TOME_HOLSTER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported tome holster bench type: ${String(benchType)}`);
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
     * Stitches and clasps basilisk hide blanks and silver buckles into tome holsters and grimoire harnesses.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftHolster(
        bench: ActiveTomeHolsterBench,
        recipeType: TomeHolsterRecipeType,
        providedLeathers: RawLeatherTomeHolsterType[],
        craftRoll?: number,
        speedRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; holster?: CraftedTomeHolster; updatedBench?: ActiveTomeHolsterBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherTomeHolsterType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Tome holster bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = TOME_HOLSTER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = TOME_HOLSTER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown tome holster recipe: ${String(recipeType)}` };
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
                reason: `Insufficient tome leather/buckles: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Scabbard torn: silver buckle clamp sheared basilisk parchment scabbard retention strap, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent spellbook drawing speed score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSpeedRoll = typeof speedRoll === "number" && Number.isFinite(speedRoll) ? Math.max(0, Math.min(1, speedRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.fastcastBonusPercent / maxBonus) * 20;
        const speedScore = Math.max(0, Math.min(100, Math.round(
            (safeSpeedRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((speedScore / 100) * 0.4); // 0.8 to 1.2x

        const finalAcceleration = Math.max(0, Math.min(100, Math.round(recipe.baseSpellCastAccelerationBonusPercent * qualityMultiplier)));
        const finalExhaustionMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseArcaneManaExhaustionMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const holster: CraftedTomeHolster = {
            holsterId: `holster_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSpellCastAccelerationBonusPercent: finalAcceleration,
            finalArcaneManaExhaustionMitigationPercent: finalExhaustionMitigate,
            spellbookDrawingSpeedPercent: speedScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            holster,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Polishes silver buckle clamp jaws and maintains tome holster bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveTomeHolsterBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveTomeHolsterBench; newDurability: number; isFunctional: boolean } {
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