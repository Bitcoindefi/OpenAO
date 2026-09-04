import crypto from "node:crypto";

/**
 * Ancient Runic Leather Blacksmith Apron Bench, Dragonhide Patch & Pyrosmith Smock Engine for OpenAO MMORPG.
 * Simulates apron stitching benches and pyrosmith smock framing anvils (Oak Blacksmith Apron Bench, Runic Ironwood Forgeworker Rig, Celestial Void Seraphic Pyrosmith Sanctum),
 * raw tanned dragonscale oxhide smock blanks and fireproof brass riveted stud sets (Tanned Dragonscale Oxhide Smock Blank, Fireproof Brass Riveted Stud Set, Celestial Void Starlight Pyrosmith Leather),
 * apprentice forge-spark aprons and seraphic pyroclastic master smock recipes (Apprentice Forge-Spark Apron, Journeyman Magma-Resistant Smock, Celestial Void Seraphic Pyroclastic Master Smock),
 * independent thermal insulation & molten slag deflection ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped fire damage mitigation bonus and clamped blacksmithing craft speed increase scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and blacksmith apron bench maintenance.
 */

export type BlacksmithApronBenchType = "OAK_BLACKSMITH_APRON_BENCH" | "RUNIC_IRONWOOD_FORGEWORKER_RIG" | "CELESTIAL_VOID_SERAPHIC_PYROSMITH_SANCTUM";
export type RawLeatherApronType = "TANNED_DRAGONSCALE_OXHIDE_SMOCK_BLANK" | "FIREPROOF_BRASS_RIVETED_STUD_SET" | "CELESTIAL_VOID_STARLIGHT_PYROSMITH_LEATHER";
export type BlacksmithApronRecipeType = "APPRENTICE_FORGE_SPARK_APRON" | "JOURNEYMAN_MAGMA_RESISTANT_SMOCK" | "CELESTIAL_VOID_SERAPHIC_PYROCLASTIC_MASTER_SMOCK";

export interface BlacksmithApronBenchData {
    benchType: BlacksmithApronBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    fireproofBonusPercent: number;
}

export interface BlacksmithApronRecipeData {
    recipeType: BlacksmithApronRecipeType;
    requiredLeatherType: RawLeatherApronType;
    requiredLeatherCount: number;
    baseFireDamageMitigationBonusPercent: number;
    baseBlacksmithCraftSpeedIncreasePercent: number;
}

export interface ActiveBlacksmithApronBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BlacksmithApronBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedBlacksmithApron {
    apronId: string;
    recipeType: BlacksmithApronRecipeType;
    finalFireDamageMitigationBonusPercent: number;
    finalBlacksmithCraftSpeedIncreasePercent: number;
    thermalInsulationPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherApronType;
    remainingProvidedLeathers: RawLeatherApronType[];
    craftedEpochMs: number;
}

export const BLACKSMITH_APRON_BENCH_CATALOG: Record<BlacksmithApronBenchType, BlacksmithApronBenchData> = {
    OAK_BLACKSMITH_APRON_BENCH: { benchType: "OAK_BLACKSMITH_APRON_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, fireproofBonusPercent: 10 },
    RUNIC_IRONWOOD_FORGEWORKER_RIG: { benchType: "RUNIC_IRONWOOD_FORGEWORKER_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, fireproofBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_PYROSMITH_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_PYROSMITH_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, fireproofBonusPercent: 35 },
};

export const BLACKSMITH_APRON_RECIPE_CATALOG: Record<BlacksmithApronRecipeType, BlacksmithApronRecipeData> = {
    APPRENTICE_FORGE_SPARK_APRON: { recipeType: "APPRENTICE_FORGE_SPARK_APRON", requiredLeatherType: "TANNED_DRAGONSCALE_OXHIDE_SMOCK_BLANK", requiredLeatherCount: 2, baseFireDamageMitigationBonusPercent: 20, baseBlacksmithCraftSpeedIncreasePercent: 10 },
    JOURNEYMAN_MAGMA_RESISTANT_SMOCK: { recipeType: "JOURNEYMAN_MAGMA_RESISTANT_SMOCK", requiredLeatherType: "FIREPROOF_BRASS_RIVETED_STUD_SET", requiredLeatherCount: 2, baseFireDamageMitigationBonusPercent: 45, baseBlacksmithCraftSpeedIncreasePercent: 25 },
    CELESTIAL_VOID_SERAPHIC_PYROCLASTIC_MASTER_SMOCK: { recipeType: "CELESTIAL_VOID_SERAPHIC_PYROCLASTIC_MASTER_SMOCK", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_PYROSMITH_LEATHER", requiredLeatherCount: 2, baseFireDamageMitigationBonusPercent: 80, baseBlacksmithCraftSpeedIncreasePercent: 60 },
};

export class AncientRunicLeatherBlacksmithApronBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BLACKSMITH_APRON_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BLACKSMITH_APRON_BENCH_CATALOG).map(b => b.fireproofBonusPercent), 1),
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
     * Constructs and initializes a blacksmith apron stitching bench or pyrosmith rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BlacksmithApronBenchType
    ): ActiveBlacksmithApronBench {
        const data = BLACKSMITH_APRON_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported blacksmith apron bench type: ${String(benchType)}`);
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
     * Stitches and studs dragonscale oxhide blanks and brass rivets into forge aprons and pyrosmith smocks.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftApron(
        bench: ActiveBlacksmithApronBench,
        recipeType: BlacksmithApronRecipeType,
        providedLeathers: RawLeatherApronType[],
        craftRoll?: number,
        insulationRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; apron?: CraftedBlacksmithApron; updatedBench?: ActiveBlacksmithApronBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherApronType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Blacksmith apron bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BLACKSMITH_APRON_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BLACKSMITH_APRON_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown blacksmith apron recipe: ${String(recipeType)}` };
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
                reason: `Insufficient blacksmith leather/studs: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Bib charred: fireproof stud punch scorched dragonscale bib seam, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent thermal insulation score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeInsulationRoll = typeof insulationRoll === "number" && Number.isFinite(insulationRoll) ? Math.max(0, Math.min(1, insulationRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.fireproofBonusPercent / maxBonus) * 20;
        const insulationScore = Math.max(0, Math.min(100, Math.round(
            (safeInsulationRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((insulationScore / 100) * 0.4); // 0.8 to 1.2x

        const finalFireDefense = Math.max(0, Math.min(100, Math.round(recipe.baseFireDamageMitigationBonusPercent * qualityMultiplier)));
        const finalCraftSpeed = Math.max(0, Math.min(100, Math.round(recipe.baseBlacksmithCraftSpeedIncreasePercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const apron: CraftedBlacksmithApron = {
            apronId: `apron_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalFireDamageMitigationBonusPercent: finalFireDefense,
            finalBlacksmithCraftSpeedIncreasePercent: finalCraftSpeed,
            thermalInsulationPercent: insulationScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            apron,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans molten slag residue and maintains blacksmith apron bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveBlacksmithApronBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveBlacksmithApronBench; newDurability: number; isFunctional: boolean } {
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