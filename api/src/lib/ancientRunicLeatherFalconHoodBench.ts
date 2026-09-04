import crypto from "node:crypto";

/**
 * Ancient Runic Leather Falcon Hood Bench, Plumage Beak Chape & Raptor Blind Engine for OpenAO MMORPG.
 * Simulates falconry hood stitching benches and raptor blind shaping blocks (Oak Falcon Hood Bench, Runic Ironwood Falconer Rig, Celestial Void Seraphic Skyhunter Sanctum),
 * raw tanned shadowhawk plumage leather blanks and gilded brass beak chape sets (Tanned Shadowhawk Plumage Leather Blank, Gilded Brass Beak Chape Set, Celestial Void Starlight Skyhunter Leather),
 * novice calming blind hoods and seraphic horizon-piercing apex blind recipes (Novice Calming Blind Hood, Master Falconer Plumed Chape Hood, Celestial Void Seraphic Horizon-Piercing Apex Blind),
 * independent plumage calming soothing & sensory dampening ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped raptor scout vision range bonus and clamped raptor agitated stress mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and falcon hood bench maintenance.
 */

export type FalconHoodBenchType = "OAK_FALCON_HOOD_BENCH" | "RUNIC_IRONWOOD_FALCONER_RIG" | "CELESTIAL_VOID_SERAPHIC_SKYHUNTER_SANCTUM";
export type RawLeatherFalconHoodType = "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK" | "GILDED_BRASS_BEAK_CHAPE_SET" | "CELESTIAL_VOID_STARLIGHT_SKYHUNTER_LEATHER";
export type FalconHoodRecipeType = "NOVICE_CALMING_BLIND_HOOD" | "MASTER_FALCONER_PLUMED_CHAPE_HOOD" | "CELESTIAL_VOID_SERAPHIC_HORIZON_PIERCING_APEX_BLIND";

export interface FalconHoodBenchData {
    benchType: FalconHoodBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    calmingBonusPercent: number;
}

export interface FalconHoodRecipeData {
    recipeType: FalconHoodRecipeType;
    requiredLeatherType: RawLeatherFalconHoodType;
    requiredLeatherCount: number;
    baseRaptorScoutVisionRangeBonusPercent: number;
    baseRaptorAgitatedStressMitigationPercent: number;
}

export interface ActiveFalconHoodBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: FalconHoodBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedFalconHood {
    hoodId: string;
    recipeType: FalconHoodRecipeType;
    finalRaptorScoutVisionRangeBonusPercent: number;
    finalRaptorAgitatedStressMitigationPercent: number;
    plumageCalmingPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherFalconHoodType;
    remainingProvidedLeathers: RawLeatherFalconHoodType[];
    craftedEpochMs: number;
}

export const FALCON_HOOD_BENCH_CATALOG: Record<FalconHoodBenchType, FalconHoodBenchData> = {
    OAK_FALCON_HOOD_BENCH: { benchType: "OAK_FALCON_HOOD_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, calmingBonusPercent: 10 },
    RUNIC_IRONWOOD_FALCONER_RIG: { benchType: "RUNIC_IRONWOOD_FALCONER_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, calmingBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_SKYHUNTER_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_SKYHUNTER_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, calmingBonusPercent: 35 },
};

export const FALCON_HOOD_RECIPE_CATALOG: Record<FalconHoodRecipeType, FalconHoodRecipeData> = {
    NOVICE_CALMING_BLIND_HOOD: { recipeType: "NOVICE_CALMING_BLIND_HOOD", requiredLeatherType: "TANNED_SHADOWHAWK_PLUMAGE_LEATHER_BLANK", requiredLeatherCount: 2, baseRaptorScoutVisionRangeBonusPercent: 20, baseRaptorAgitatedStressMitigationPercent: 10 },
    MASTER_FALCONER_PLUMED_CHAPE_HOOD: { recipeType: "MASTER_FALCONER_PLUMED_CHAPE_HOOD", requiredLeatherType: "GILDED_BRASS_BEAK_CHAPE_SET", requiredLeatherCount: 2, baseRaptorScoutVisionRangeBonusPercent: 45, baseRaptorAgitatedStressMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_HORIZON_PIERCING_APEX_BLIND: { recipeType: "CELESTIAL_VOID_SERAPHIC_HORIZON_PIERCING_APEX_BLIND", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_SKYHUNTER_LEATHER", requiredLeatherCount: 2, baseRaptorScoutVisionRangeBonusPercent: 80, baseRaptorAgitatedStressMitigationPercent: 60 },
};

export class AncientRunicLeatherFalconHoodBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(FALCON_HOOD_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(FALCON_HOOD_BENCH_CATALOG).map(b => b.calmingBonusPercent), 1),
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
     * Constructs and initializes a falcon hood stitching bench or falconer rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: FalconHoodBenchType
    ): ActiveFalconHoodBench {
        const data = FALCON_HOOD_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported falcon hood bench type: ${String(benchType)}`);
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
     * Stitches and rivets shadowhawk plumage blanks and beak chapes into falcon hoods.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftHood(
        bench: ActiveFalconHoodBench,
        recipeType: FalconHoodRecipeType,
        providedLeathers: RawLeatherFalconHoodType[],
        craftRoll?: number,
        calmingRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; hood?: CraftedFalconHood; updatedBench?: ActiveFalconHoodBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherFalconHoodType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Falcon hood bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = FALCON_HOOD_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = FALCON_HOOD_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown falcon hood recipe: ${String(recipeType)}` };
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
                reason: `Insufficient falcon leather/chapes: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Beak chape misaligned: brass riveting punch crimped plumage eye blind, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent plumage calming score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeCalmingRoll = typeof calmingRoll === "number" && Number.isFinite(calmingRoll) ? Math.max(0, Math.min(1, calmingRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.calmingBonusPercent / maxBonus) * 20;
        const calmingScore = Math.max(0, Math.min(100, Math.round(
            (safeCalmingRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((calmingScore / 100) * 0.4); // 0.8 to 1.2x

        const finalVisionBonus = Math.max(0, Math.min(100, Math.round(recipe.baseRaptorScoutVisionRangeBonusPercent * qualityMultiplier)));
        const finalStressMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseRaptorAgitatedStressMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const hood: CraftedFalconHood = {
            hoodId: `hood_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalRaptorScoutVisionRangeBonusPercent: finalVisionBonus,
            finalRaptorAgitatedStressMitigationPercent: finalStressMitigate,
            plumageCalmingPercent: calmingScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            hood,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans plumage dust and maintains falcon hood bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveFalconHoodBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveFalconHoodBench; newDurability: number; isFunctional: boolean } {
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