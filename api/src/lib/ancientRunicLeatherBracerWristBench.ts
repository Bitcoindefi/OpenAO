import crypto from "node:crypto";

/**
 * Ancient Runic Leather Bracer Wrist Bench, Steel Buckle Clamp & Combat Vambrace Engine for OpenAO MMORPG.
 * Simulates bracer wrist stitching benches and steel clamp riveting anvils (Oak Bracer Wrist Bench, Runic Ironwood Vambrace Rig, Celestial Void Seraphic Aegis Wrist Sanctum),
 * raw tanned hardened bullhide bracer blanks and steel riveted buckle clamps (Tanned Hardened Bullhide Bracer Blank, Steel Riveted Buckle Clamp, Celestial Void Starlight Vambrace Leather),
 * archer flex wristguards and seraphic aegis havoc bracer recipes (Archer Flex-Pivot Wristguard, Duelist Steel-Reinforced Vambrace, Celestial Void Seraphic Aegis Havoc Bracer),
 * independent wrist articulation & quick-draw dexterity ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped archery draw speed bonus and clamped wrist injury strain mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and bracer bench maintenance.
 */

export type BracerBenchType = "OAK_BRACER_WRIST_BENCH" | "RUNIC_IRONWOOD_VAMBRACE_RIG" | "CELESTIAL_VOID_SERAPHIC_AEGIS_WRIST_SANCTUM";
export type RawLeatherBracerType = "TANNED_HARDENED_BULLHIDE_BRACER_BLANK" | "STEEL_RIVETED_BUCKLE_CLAMP" | "CELESTIAL_VOID_STARLIGHT_VAMBRACE_LEATHER";
export type CombatBracerRecipeType = "ARCHER_FLEX_PIVOT_WRISTGUARD" | "DUELIST_STEEL_REINFORCED_VAMBRACE" | "CELESTIAL_VOID_SERAPHIC_AEGIS_HAVOC_BRACER";

export interface BracerBenchData {
    benchType: BracerBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    dexterityBonusPercent: number;
}

export interface CombatBracerRecipeData {
    recipeType: CombatBracerRecipeType;
    requiredLeatherType: RawLeatherBracerType;
    requiredLeatherCount: number;
    baseArcheryDrawSpeedBonusPercent: number;
    baseWristStrainMitigationPercent: number;
}

export interface ActiveBracerBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: BracerBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedCombatBracer {
    bracerId: string;
    recipeType: CombatBracerRecipeType;
    finalArcheryDrawSpeedBonusPercent: number;
    finalWristStrainMitigationPercent: number;
    wristArticulationPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherBracerType;
    remainingProvidedLeathers: RawLeatherBracerType[];
    craftedEpochMs: number;
}

export const BRACER_BENCH_CATALOG: Record<BracerBenchType, BracerBenchData> = {
    OAK_BRACER_WRIST_BENCH: { benchType: "OAK_BRACER_WRIST_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, dexterityBonusPercent: 10 },
    RUNIC_IRONWOOD_VAMBRACE_RIG: { benchType: "RUNIC_IRONWOOD_VAMBRACE_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, dexterityBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_AEGIS_WRIST_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_AEGIS_WRIST_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, dexterityBonusPercent: 35 },
};

export const BRACER_RECIPE_CATALOG: Record<CombatBracerRecipeType, CombatBracerRecipeData> = {
    ARCHER_FLEX_PIVOT_WRISTGUARD: { recipeType: "ARCHER_FLEX_PIVOT_WRISTGUARD", requiredLeatherType: "TANNED_HARDENED_BULLHIDE_BRACER_BLANK", requiredLeatherCount: 2, baseArcheryDrawSpeedBonusPercent: 20, baseWristStrainMitigationPercent: 10 },
    DUELIST_STEEL_REINFORCED_VAMBRACE: { recipeType: "DUELIST_STEEL_REINFORCED_VAMBRACE", requiredLeatherType: "STEEL_RIVETED_BUCKLE_CLAMP", requiredLeatherCount: 2, baseArcheryDrawSpeedBonusPercent: 45, baseWristStrainMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_AEGIS_HAVOC_BRACER: { recipeType: "CELESTIAL_VOID_SERAPHIC_AEGIS_HAVOC_BRACER", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_VAMBRACE_LEATHER", requiredLeatherCount: 2, baseArcheryDrawSpeedBonusPercent: 80, baseWristStrainMitigationPercent: 60 },
};

export class AncientRunicLeatherBracerWristBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BRACER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(BRACER_BENCH_CATALOG).map(b => b.dexterityBonusPercent), 1),
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
     * Constructs and initializes a bracer wrist stitching bench or vambrace rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: BracerBenchType
    ): ActiveBracerBench {
        const data = BRACER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported bracer bench type: ${String(benchType)}`);
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
     * Stitches and clamps bullhide blanks and steel rivets into wristguards and vambraces.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftBracer(
        bench: ActiveBracerBench,
        recipeType: CombatBracerRecipeType,
        providedLeathers: RawLeatherBracerType[],
        craftRoll?: number,
        articulationRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; bracer?: CraftedCombatBracer; updatedBench?: ActiveBracerBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherBracerType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Bracer wrist bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BRACER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = BRACER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bracer recipe: ${String(recipeType)}` };
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
                reason: `Insufficient bracer leather/rivets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Strap fractured: steel rivet clamp sheared hardened bullhide wrist cuff, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent wrist articulation score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeArticulationRoll = typeof articulationRoll === "number" && Number.isFinite(articulationRoll) ? Math.max(0, Math.min(1, articulationRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.dexterityBonusPercent / maxBonus) * 20;
        const articulationScore = Math.max(0, Math.min(100, Math.round(
            (safeArticulationRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((articulationScore / 100) * 0.4); // 0.8 to 1.2x

        const finalDrawSpeed = Math.max(0, Math.min(100, Math.round(recipe.baseArcheryDrawSpeedBonusPercent * qualityMultiplier)));
        const finalStrainMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseWristStrainMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const bracer: CraftedCombatBracer = {
            bracerId: `bracer_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalArcheryDrawSpeedBonusPercent: finalDrawSpeed,
            finalWristStrainMitigationPercent: finalStrainMitigate,
            wristArticulationPercent: articulationScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            bracer,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-lubricates clamp vise guides and maintains bracer wrist bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveBracerBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveBracerBench; newDurability: number; isFunctional: boolean } {
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