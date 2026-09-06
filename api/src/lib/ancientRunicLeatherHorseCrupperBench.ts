import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Crupper Bench, Mithril Tail Dock Rig & Celestial Valkyrie Crupper Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian crupper crafting benches and tail-dock tension rigs (Elder Crupper Bench, Runic Oak Crupper Rig, Celestial Void Valkyrie Crupper Sanctum),
 * raw tanned stallion crupper straps and tempered mithril crupper dock ring sets (Tanned Stallion Crupper Strap, Tempered Mithril Crupper Dock Ring, Celestial Void Astral Crupper Pelt),
 * novice expedition cruppers and sovereign aerial crupper recipes (Novice Expedition Crupper, Warmaster Mithril Reinforced Crupper, Celestial Void Valkyrie Sovereign Crupper),
 * independent steed downhill-saddle retention ratings and tail dock comfort ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped downhill saddle retention bonus and tail dock comfort scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse crupper bench maintenance.
 */

export type CrupperBenchType = "ELDER_CRUPPER_BENCH" | "RUNIC_OAK_CRUPPER_RIG" | "CELESTIAL_VOID_VALKYRIE_CRUPPER_SANCTUM";
export type RawLeatherCrupperType = "TANNED_STALLION_CRUPPER_STRAP" | "TEMPERED_MITHRIL_CRUPPER_DOCK_RING" | "CELESTIAL_VOID_ASTRAL_CRUPPER_PELT";
export type CrupperRecipeType = "NOVICE_EXPEDITION_CRUPPER" | "WARMASTER_MITHRIL_REINFORCED_CRUPPER" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER";

export interface CrupperBenchData {
    benchType: CrupperBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    crupperStabilityBonusPercent: number;
}

export interface CrupperRecipeData {
    recipeType: CrupperRecipeType;
    requiredLeatherType: RawLeatherCrupperType;
    requiredLeatherCount: number;
    baseDownhillSaddleRetentionPercent: number;
    baseTailDockComfortPercent: number;
}

export interface ActiveCrupperBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CrupperBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCrupper {
    crupperId: string;
    recipeType: CrupperRecipeType;
    finalDownhillSaddleRetentionPercent: number;
    finalTailDockComfortPercent: number;
    crupperAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCrupperType;
    remainingProvidedLeathers: RawLeatherCrupperType[];
    craftedEpochMs: number;
}

export const CRUPPER_BENCH_CATALOG: Record<CrupperBenchType, CrupperBenchData> = {
    ELDER_CRUPPER_BENCH: { benchType: "ELDER_CRUPPER_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, crupperStabilityBonusPercent: 14 },
    RUNIC_OAK_CRUPPER_RIG: { benchType: "RUNIC_OAK_CRUPPER_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, crupperStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CRUPPER_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CRUPPER_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, crupperStabilityBonusPercent: 40 },
};

export const CRUPPER_RECIPE_CATALOG: Record<CrupperRecipeType, CrupperRecipeData> = {
    NOVICE_EXPEDITION_CRUPPER: { recipeType: "NOVICE_EXPEDITION_CRUPPER", requiredLeatherType: "TANNED_STALLION_CRUPPER_STRAP", requiredLeatherCount: 2, baseDownhillSaddleRetentionPercent: 24, baseTailDockComfortPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_CRUPPER: { recipeType: "WARMASTER_MITHRIL_REINFORCED_CRUPPER", requiredLeatherType: "TEMPERED_MITHRIL_CRUPPER_DOCK_RING", requiredLeatherCount: 2, baseDownhillSaddleRetentionPercent: 50, baseTailDockComfortPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CRUPPER", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CRUPPER_PELT", requiredLeatherCount: 2, baseDownhillSaddleRetentionPercent: 84, baseTailDockComfortPercent: 64 },
};

export class AncientRunicLeatherHorseCrupperBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CRUPPER_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CRUPPER_BENCH_CATALOG).map(b => b.crupperStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse crupper crafting bench or tail-dock tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CrupperBenchType
    ): ActiveCrupperBench {
        const data = CRUPPER_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse crupper bench type: ${String(benchType)}`);
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
     * Stitches and tensions crupper straps and tempered mithril dock rings into horse cruppers.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCrupper(
        bench: ActiveCrupperBench,
        recipeType: CrupperRecipeType,
        providedLeathers: RawLeatherCrupperType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; crupper?: CraftedHorseCrupper; updatedBench?: ActiveCrupperBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCrupperType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse crupper bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CRUPPER_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CRUPPER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse crupper recipe: ${String(recipeType)}` };
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
                reason: `Insufficient crupper straps/dock rings: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Crupper strap misaligned: mithril dock ring slipped under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent crupper anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.crupperStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRetention = Math.max(0, Math.min(100, Math.round(recipe.baseDownhillSaddleRetentionPercent * qualityMultiplier)));
        const finalComfort = Math.max(0, Math.min(100, Math.round(recipe.baseTailDockComfortPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const crupper: CraftedHorseCrupper = {
            crupperId: `crupper_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalDownhillSaddleRetentionPercent: finalRetention,
            finalTailDockComfortPercent: finalComfort,
            crupperAnchorStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            crupper,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse crupper bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCrupperBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCrupperBench; newDurability: number; isFunctional: boolean } {
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
