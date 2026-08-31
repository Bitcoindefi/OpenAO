import crypto from "node:crypto";

/**
 * Ancient Runic Leather Trophy Mount Bench, Taxidermy Flesh Hook & Beast Wall Mount Engine for OpenAO MMORPG.
 * Simulates trophy mounting benches and taxidermy flesh hook frames (Oak Trophy Mounting Bench, Runic Ironwood Taxidermy Rig, Celestial Void Seraphic Trophy Sanctum),
 * raw tanned direbear hides and carved mammoth ivory plaques (Tanned Direbear Trophy Hide, Carved Mammoth Ivory Plaque, Celestial Void Starlight Sovereign Trophy Leather),
 * dire wolf wall mounts and sovereign dragon trophy recipes (Hunter Dire Wolf Wall Mount, Champion Manticore Head Mount, Celestial Void Seraphic Dragon Sovereign Wall Mount),
 * independent morale inspiring ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped combat morale bonus and clamped resting stamina regeneration scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and trophy bench maintenance.
 */

export type TrophyBenchType = "OAK_TROPHY_MOUNTING_BENCH" | "RUNIC_IRONWOOD_TAXIDERMY_RIG" | "CELESTIAL_VOID_SERAPHIC_TROPHY_SANCTUM";
export type RawLeatherTrophyType = "TANNED_DIREBEAR_TROPHY_HIDE" | "CARVED_MAMMOTH_IVORY_PLAQUE" | "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_TROPHY_LEATHER";
export type BeastTrophyRecipeType = "HUNTER_DIRE_WOLF_WALL_MOUNT" | "CHAMPION_MANTICORE_HEAD_MOUNT" | "CELESTIAL_VOID_SERAPHIC_DRAGON_SOVEREIGN_WALL_MOUNT";

export interface TrophyBenchData {
    benchType: TrophyBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    moraleBonusPercent: number;
}

export interface BeastTrophyRecipeData {
    recipeType: BeastTrophyRecipeType;
    requiredLeatherType: RawLeatherTrophyType;
    requiredLeatherCount: number;
    baseCombatMoraleBonusPercent: number;
    baseRestingStaminaRegenPercent: number;
}

export interface ActiveTrophyBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: TrophyBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedBeastTrophy {
    trophyId: string;
    recipeType: BeastTrophyRecipeType;
    finalCombatMoraleBonusPercent: number;
    finalRestingStaminaRegenPercent: number;
    moraleInspiringPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherTrophyType;
    remainingProvidedLeathers: RawLeatherTrophyType[];
    craftedEpochMs: number;
}

export const TROPHY_BENCH_CATALOG: Record<TrophyBenchType, TrophyBenchData> = {
    OAK_TROPHY_MOUNTING_BENCH: { benchType: "OAK_TROPHY_MOUNTING_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, moraleBonusPercent: 10 },
    RUNIC_IRONWOOD_TAXIDERMY_RIG: { benchType: "RUNIC_IRONWOOD_TAXIDERMY_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, moraleBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_TROPHY_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_TROPHY_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, moraleBonusPercent: 35 },
};

export const TROPHY_RECIPE_CATALOG: Record<BeastTrophyRecipeType, BeastTrophyRecipeData> = {
    HUNTER_DIRE_WOLF_WALL_MOUNT: { recipeType: "HUNTER_DIRE_WOLF_WALL_MOUNT", requiredLeatherType: "TANNED_DIREBEAR_TROPHY_HIDE", requiredLeatherCount: 2, baseCombatMoraleBonusPercent: 20, baseRestingStaminaRegenPercent: 10 },
    CHAMPION_MANTICORE_HEAD_MOUNT: { recipeType: "CHAMPION_MANTICORE_HEAD_MOUNT", requiredLeatherType: "CARVED_MAMMOTH_IVORY_PLAQUE", requiredLeatherCount: 2, baseCombatMoraleBonusPercent: 45, baseRestingStaminaRegenPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_DRAGON_SOVEREIGN_WALL_MOUNT: { recipeType: "CELESTIAL_VOID_SERAPHIC_DRAGON_SOVEREIGN_WALL_MOUNT", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_SOVEREIGN_TROPHY_LEATHER", requiredLeatherCount: 2, baseCombatMoraleBonusPercent: 80, baseRestingStaminaRegenPercent: 60 },
};

export class AncientRunicLeatherTrophyMountBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(TROPHY_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(TROPHY_BENCH_CATALOG).map(b => b.moraleBonusPercent), 1),
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
     * Constructs and initializes a trophy mounting bench or taxidermy rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: TrophyBenchType
    ): ActiveTrophyBench {
        const data = TROPHY_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported trophy bench type: ${String(benchType)}`);
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
     * Mounts and stretches trophy hides and ivory plaques into majestic wall trophies.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftTrophyMount(
        bench: ActiveTrophyBench,
        recipeType: BeastTrophyRecipeType,
        providedLeathers: RawLeatherTrophyType[],
        craftRoll?: number,
        moraleRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; trophy?: CraftedBeastTrophy; updatedBench?: ActiveTrophyBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherTrophyType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Trophy mounting bench is fractured or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = TROPHY_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = TROPHY_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown trophy recipe: ${String(recipeType)}` };
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
                reason: `Insufficient trophy leather/ivory: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Plaque splintered: flesh hook tensioner ripped hide mounting edge, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent morale inspiring score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeMoraleRoll = typeof moraleRoll === "number" && Number.isFinite(moraleRoll) ? Math.max(0, Math.min(1, moraleRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.moraleBonusPercent / maxBonus) * 20;
        const moraleScore = Math.max(0, Math.min(100, Math.round(
            (safeMoraleRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((moraleScore / 100) * 0.4); // 0.8 to 1.2x

        const finalMorale = Math.max(0, Math.min(100, Math.round(recipe.baseCombatMoraleBonusPercent * qualityMultiplier)));
        const finalResting = Math.max(0, Math.min(100, Math.round(recipe.baseRestingStaminaRegenPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const trophy: CraftedBeastTrophy = {
            trophyId: `trophy_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalCombatMoraleBonusPercent: finalMorale,
            finalRestingStaminaRegenPercent: finalResting,
            moraleInspiringPercent: moraleScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            trophy,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-wires mounting frame brackets and maintains trophy mounting bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveTrophyBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveTrophyBench; newDurability: number; isFunctional: boolean } {
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