import crypto from "node:crypto";

/**
 * Ancient Runic Leather Mask Hood Bench, Nightshade Dye Vat & Assassin Cowl Engine for OpenAO MMORPG.
 * Simulates mask hood stitching benches and nightshade dye vat frames (Oak Mask Hood Bench, Runic Ironwood Stalker Rig, Celestial Void Seraphic Shadow Sanctum),
 * raw tanned shadowcat hide mask blanks and concentrated nightshade dye cakes (Tanned Shadowcat Hide Mask Blank, Concentrated Nightshade Dye Cake, Celestial Void Starlight Assassin Leather),
 * rogue shadow-stalker masks and seraphic phantom eclipse hood recipes (Rogue Shadow-Stalker Mask, Assassin Night-Veil Cowl, Celestial Void Seraphic Phantom Eclipse Hood),
 * independent shadow concealment & peripheral sight ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped sneak attack damage bonus and clamped stealth detection radius reduction scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and mask bench maintenance.
 */

export type MaskBenchType = "OAK_MASK_HOOD_BENCH" | "RUNIC_IRONWOOD_STALKER_RIG" | "CELESTIAL_VOID_SERAPHIC_SHADOW_SANCTUM";
export type RawLeatherMaskType = "TANNED_SHADOWCAT_HIDE_MASK_BLANK" | "CONCENTRATED_NIGHTSHADE_DYE_CAKE" | "CELESTIAL_VOID_STARLIGHT_ASSASSIN_LEATHER";
export type AssassinMaskRecipeType = "ROGUE_SHADOW_STALKER_MASK" | "ASSASSIN_NIGHT_VEIL_COWL" | "CELESTIAL_VOID_SERAPHIC_PHANTOM_ECLIPSE_HOOD";

export interface MaskBenchData {
    benchType: MaskBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    concealmentBonusPercent: number;
}

export interface AssassinMaskRecipeData {
    recipeType: AssassinMaskRecipeType;
    requiredLeatherType: RawLeatherMaskType;
    requiredLeatherCount: number;
    baseSneakAttackDamageBonusPercent: number;
    baseStealthDetectionRadiusReductionPercent: number;
}

export interface ActiveMaskBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: MaskBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedAssassinMask {
    maskId: string;
    recipeType: AssassinMaskRecipeType;
    finalSneakAttackDamageBonusPercent: number;
    finalStealthDetectionRadiusReductionPercent: number;
    shadowConcealmentPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherMaskType;
    remainingProvidedLeathers: RawLeatherMaskType[];
    craftedEpochMs: number;
}

export const MASK_BENCH_CATALOG: Record<MaskBenchType, MaskBenchData> = {
    OAK_MASK_HOOD_BENCH: { benchType: "OAK_MASK_HOOD_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, concealmentBonusPercent: 10 },
    RUNIC_IRONWOOD_STALKER_RIG: { benchType: "RUNIC_IRONWOOD_STALKER_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, concealmentBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_SHADOW_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_SHADOW_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, concealmentBonusPercent: 35 },
};

export const MASK_RECIPE_CATALOG: Record<AssassinMaskRecipeType, AssassinMaskRecipeData> = {
    ROGUE_SHADOW_STALKER_MASK: { recipeType: "ROGUE_SHADOW_STALKER_MASK", requiredLeatherType: "TANNED_SHADOWCAT_HIDE_MASK_BLANK", requiredLeatherCount: 2, baseSneakAttackDamageBonusPercent: 20, baseStealthDetectionRadiusReductionPercent: 10 },
    ASSASSIN_NIGHT_VEIL_COWL: { recipeType: "ASSASSIN_NIGHT_VEIL_COWL", requiredLeatherType: "CONCENTRATED_NIGHTSHADE_DYE_CAKE", requiredLeatherCount: 2, baseSneakAttackDamageBonusPercent: 45, baseStealthDetectionRadiusReductionPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_PHANTOM_ECLIPSE_HOOD: { recipeType: "CELESTIAL_VOID_SERAPHIC_PHANTOM_ECLIPSE_HOOD", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_ASSASSIN_LEATHER", requiredLeatherCount: 2, baseSneakAttackDamageBonusPercent: 80, baseStealthDetectionRadiusReductionPercent: 60 },
};

export class AncientRunicLeatherMaskHoodBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(MASK_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(MASK_BENCH_CATALOG).map(b => b.concealmentBonusPercent), 1),
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
     * Constructs and initializes a mask hood stitching bench or stalker rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: MaskBenchType
    ): ActiveMaskBench {
        const data = MASK_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported mask bench type: ${String(benchType)}`);
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
     * Stitches and nightshade-dyes shadowcat blanks and dye cakes into stealth masks and cowls.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftMask(
        bench: ActiveMaskBench,
        recipeType: AssassinMaskRecipeType,
        providedLeathers: RawLeatherMaskType[],
        craftRoll?: number,
        concealmentRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; mask?: CraftedAssassinMask; updatedBench?: ActiveMaskBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherMaskType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Mask hood bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = MASK_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = MASK_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown mask recipe: ${String(recipeType)}` };
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
                reason: `Insufficient mask leather/dye: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Veil blotched: nightshade vat acid stained shadowcat eye aperture, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent shadow concealment score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeConcealmentRoll = typeof concealmentRoll === "number" && Number.isFinite(concealmentRoll) ? Math.max(0, Math.min(1, concealmentRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.concealmentBonusPercent / maxBonus) * 20;
        const concealmentScore = Math.max(0, Math.min(100, Math.round(
            (safeConcealmentRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((concealmentScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSneakDamage = Math.max(0, Math.min(100, Math.round(recipe.baseSneakAttackDamageBonusPercent * qualityMultiplier)));
        const finalDetectionMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseStealthDetectionRadiusReductionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const mask: CraftedAssassinMask = {
            maskId: `mask_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSneakAttackDamageBonusPercent: finalSneakDamage,
            finalStealthDetectionRadiusReductionPercent: finalDetectionMitigate,
            shadowConcealmentPercent: concealmentScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            mask,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-neutralizes dye vat agitation paddles and maintains mask hood bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveMaskBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveMaskBench; newDurability: number; isFunctional: boolean } {
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