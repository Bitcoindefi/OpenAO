import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Stirrup Fender Bench, Mithril Slider Rig & Celestial Valkyrie Fender Sanctum Engine for OpenAO MMORPG.
 * Simulates stirrup fender stitching benches and leg shielding tension rigs (Elder Fender Bench, Runic Oak Fender Rig, Celestial Void Valkyrie Fender Sanctum),
 * raw tanned buffalo fender panels and tempered mithril fender slider sets (Tanned Buffalo Fender Panel, Tempered Mithril Fender Slider Set, Celestial Void Astral Fender Pelt),
 * novice reinforced leg fenders and sovereign aerial fender recipes (Novice Reinforced Leg Fender, Warmaster Mithril Slider Fender, Celestial Void Valkyrie Sovereign Fender),
 * independent steed leg-friction protection ratings and stirrup sway mitigation ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped leg friction protection bonus and stirrup sway mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse stirrup fender bench maintenance.
 */

export type FenderBenchType = "ELDER_FENDER_BENCH" | "RUNIC_OAK_FENDER_RIG" | "CELESTIAL_VOID_VALKYRIE_FENDER_SANCTUM";
export type RawLeatherFenderType = "TANNED_BUFFALO_FENDER_PANEL" | "TEMPERED_MITHRIL_FENDER_SLIDER_SET" | "CELESTIAL_VOID_ASTRAL_FENDER_PELT";
export type FenderRecipeType = "NOVICE_REINFORCED_LEG_FENDER" | "WARMASTER_MITHRIL_SLIDER_FENDER" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FENDER";

export interface FenderBenchData {
    benchType: FenderBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    legShieldingBonusPercent: number;
}

export interface FenderRecipeData {
    recipeType: FenderRecipeType;
    requiredLeatherType: RawLeatherFenderType;
    requiredLeatherCount: number;
    baseLegFrictionProtectionPercent: number;
    baseStirrupSwayMitigationBonusPercent: number;
}

export interface ActiveFenderBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: FenderBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseFender {
    fenderId: string;
    recipeType: FenderRecipeType;
    finalLegFrictionProtectionPercent: number;
    finalStirrupSwayMitigationBonusPercent: number;
    legShieldingPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherFenderType;
    remainingProvidedLeathers: RawLeatherFenderType[];
    craftedEpochMs: number;
}

export const FENDER_BENCH_CATALOG: Record<FenderBenchType, FenderBenchData> = {
    ELDER_FENDER_BENCH: { benchType: "ELDER_FENDER_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, legShieldingBonusPercent: 14 },
    RUNIC_OAK_FENDER_RIG: { benchType: "RUNIC_OAK_FENDER_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, legShieldingBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_FENDER_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_FENDER_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, legShieldingBonusPercent: 40 },
};

export const FENDER_RECIPE_CATALOG: Record<FenderRecipeType, FenderRecipeData> = {
    NOVICE_REINFORCED_LEG_FENDER: { recipeType: "NOVICE_REINFORCED_LEG_FENDER", requiredLeatherType: "TANNED_BUFFALO_FENDER_PANEL", requiredLeatherCount: 2, baseLegFrictionProtectionPercent: 24, baseStirrupSwayMitigationBonusPercent: 14 },
    WARMASTER_MITHRIL_SLIDER_FENDER: { recipeType: "WARMASTER_MITHRIL_SLIDER_FENDER", requiredLeatherType: "TEMPERED_MITHRIL_FENDER_SLIDER_SET", requiredLeatherCount: 2, baseLegFrictionProtectionPercent: 50, baseStirrupSwayMitigationBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FENDER: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_FENDER", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_FENDER_PELT", requiredLeatherCount: 2, baseLegFrictionProtectionPercent: 84, baseStirrupSwayMitigationBonusPercent: 64 },
};

export class AncientRunicLeatherHorseFenderBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(FENDER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(FENDER_BENCH_CATALOG).map(b => b.legShieldingBonusPercent), 1),
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
     * Constructs and initializes a horse stirrup fender stitching bench or slider rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: FenderBenchType
    ): ActiveFenderBench {
        const data = FENDER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse stirrup fender bench type: ${String(benchType)}`);
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
     * Stitches and tensions reinforced fender panels and tempered mithril fender sliders into horse stirrup fenders.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftFender(
        bench: ActiveFenderBench,
        recipeType: FenderRecipeType,
        providedLeathers: RawLeatherFenderType[],
        craftRoll?: number,
        shieldingRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; fender?: CraftedHorseFender; updatedBench?: ActiveFenderBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherFenderType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse stirrup fender bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = FENDER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = FENDER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse stirrup fender recipe: ${String(recipeType)}` };
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
                reason: `Insufficient fender panels/slider sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Fender panel misaligned: mithril slider rail warped under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent leg shielding score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeShieldingRoll = typeof shieldingRoll === "number" && Number.isFinite(shieldingRoll) ? Math.max(0, Math.min(1, shieldingRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.legShieldingBonusPercent / maxBonus) * 20;
        const shieldingScore = Math.max(0, Math.min(100, Math.round(
            (safeShieldingRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((shieldingScore / 100) * 0.4); // 0.8 to 1.2x

        const finalProtection = Math.max(0, Math.min(100, Math.round(recipe.baseLegFrictionProtectionPercent * qualityMultiplier)));
        const finalSwayBonus = Math.max(0, Math.min(100, Math.round(recipe.baseStirrupSwayMitigationBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const fender: CraftedHorseFender = {
            fenderId: `fender_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalLegFrictionProtectionPercent: finalProtection,
            finalStirrupSwayMitigationBonusPercent: finalSwayBonus,
            legShieldingPercent: shieldingScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            fender,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse stirrup fender bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveFenderBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveFenderBench; newDurability: number; isFunctional: boolean } {
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
