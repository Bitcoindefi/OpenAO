import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Pommel Bag Bench, Mithril Latch Rig & Celestial Valkyrie Pommel Sanctum Engine for OpenAO MMORPG.
 * Simulates saddle horn pommel bag stitching benches and pouch latch tension rigs (Elder Pommel Bag Bench, Runic Oak Pommel Bag Rig, Celestial Void Valkyrie Pommel Sanctum),
 * raw tanned buffalo pommel pouch straps and tempered mithril pommel latch sets (Tanned Buffalo Pommel Pouch Strap, Tempered Mithril Pommel Latch Set, Celestial Void Astral Pommel Pelt),
 * novice expedition pommel bags and sovereign aerial pommel bag recipes (Novice Expedition Pommel Bag, Warmaster Mithril Latched Pommel Bag, Celestial Void Valkyrie Sovereign Pommel Bag),
 * independent steed quick-access efficiency ratings and saddle horn balance ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped quick access efficiency bonus and saddle horn balance scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse pommel bag bench maintenance.
 */

export type PommelBagBenchType = "ELDER_POMMEL_BAG_BENCH" | "RUNIC_OAK_POMMEL_BAG_RIG" | "CELESTIAL_VOID_VALKYRIE_POMMEL_SANCTUM";
export type RawLeatherPommelBagType = "TANNED_BUFFALO_POMMEL_POUCH_STRAP" | "TEMPERED_MITHRIL_POMMEL_LATCH_SET" | "CELESTIAL_VOID_ASTRAL_POMMEL_PELT";
export type PommelBagRecipeType = "NOVICE_EXPEDITION_POMMEL_BAG" | "WARMASTER_MITHRIL_LATCHED_POMMEL_BAG" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POMMEL_BAG";

export interface PommelBagBenchData {
    benchType: PommelBagBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    pommelAttachmentStabilityBonusPercent: number;
}

export interface PommelBagRecipeData {
    recipeType: PommelBagRecipeType;
    requiredLeatherType: RawLeatherPommelBagType;
    requiredLeatherCount: number;
    baseQuickAccessEfficiencyPercent: number;
    baseSaddleHornBalanceBonusPercent: number;
}

export interface ActivePommelBagBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: PommelBagBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorsePommelBag {
    pommelBagId: string;
    recipeType: PommelBagRecipeType;
    finalQuickAccessEfficiencyPercent: number;
    finalSaddleHornBalanceBonusPercent: number;
    pommelAttachmentStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherPommelBagType;
    remainingProvidedLeathers: RawLeatherPommelBagType[];
    craftedEpochMs: number;
}

export const POMMEL_BAG_BENCH_CATALOG: Record<PommelBagBenchType, PommelBagBenchData> = {
    ELDER_POMMEL_BAG_BENCH: { benchType: "ELDER_POMMEL_BAG_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, pommelAttachmentStabilityBonusPercent: 14 },
    RUNIC_OAK_POMMEL_BAG_RIG: { benchType: "RUNIC_OAK_POMMEL_BAG_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, pommelAttachmentStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_POMMEL_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_POMMEL_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, pommelAttachmentStabilityBonusPercent: 40 },
};

export const POMMEL_BAG_RECIPE_CATALOG: Record<PommelBagRecipeType, PommelBagRecipeData> = {
    NOVICE_EXPEDITION_POMMEL_BAG: { recipeType: "NOVICE_EXPEDITION_POMMEL_BAG", requiredLeatherType: "TANNED_BUFFALO_POMMEL_POUCH_STRAP", requiredLeatherCount: 2, baseQuickAccessEfficiencyPercent: 24, baseSaddleHornBalanceBonusPercent: 14 },
    WARMASTER_MITHRIL_LATCHED_POMMEL_BAG: { recipeType: "WARMASTER_MITHRIL_LATCHED_POMMEL_BAG", requiredLeatherType: "TEMPERED_MITHRIL_POMMEL_LATCH_SET", requiredLeatherCount: 2, baseQuickAccessEfficiencyPercent: 50, baseSaddleHornBalanceBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POMMEL_BAG: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_POMMEL_BAG", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_POMMEL_PELT", requiredLeatherCount: 2, baseQuickAccessEfficiencyPercent: 84, baseSaddleHornBalanceBonusPercent: 64 },
};

export class AncientRunicLeatherHorsePommelBagBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(POMMEL_BAG_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(POMMEL_BAG_BENCH_CATALOG).map(b => b.pommelAttachmentStabilityBonusPercent), 1),
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
     * Constructs and initializes a horse pommel bag stitching bench or latch tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: PommelBagBenchType
    ): ActivePommelBagBench {
        const data = POMMEL_BAG_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse pommel bag bench type: ${String(benchType)}`);
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
     * Stitches and tensions pommel pouch straps and tempered mithril latch sets into horse pommel bags.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftPommelBag(
        bench: ActivePommelBagBench,
        recipeType: PommelBagRecipeType,
        providedLeathers: RawLeatherPommelBagType[],
        craftRoll?: number,
        attachmentRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; pommelBag?: CraftedHorsePommelBag; updatedBench?: ActivePommelBagBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherPommelBagType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse pommel bag bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = POMMEL_BAG_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = POMMEL_BAG_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse pommel bag recipe: ${String(recipeType)}` };
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
                reason: `Insufficient pommel pouch straps/latch sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Pommel pouch strap misaligned: mithril latch spring bent under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent pommel attachment score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeAttachmentRoll = typeof attachmentRoll === "number" && Number.isFinite(attachmentRoll) ? Math.max(0, Math.min(1, attachmentRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.pommelAttachmentStabilityBonusPercent / maxBonus) * 20;
        const attachmentScore = Math.max(0, Math.min(100, Math.round(
            (safeAttachmentRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((attachmentScore / 100) * 0.4); // 0.8 to 1.2x

        const finalAccess = Math.max(0, Math.min(100, Math.round(recipe.baseQuickAccessEfficiencyPercent * qualityMultiplier)));
        const finalBalance = Math.max(0, Math.min(100, Math.round(recipe.baseSaddleHornBalanceBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const pommelBag: CraftedHorsePommelBag = {
            pommelBagId: `pommelbag_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalQuickAccessEfficiencyPercent: finalAccess,
            finalSaddleHornBalanceBonusPercent: finalBalance,
            pommelAttachmentStabilityPercent: attachmentScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            pommelBag,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse pommel bag bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActivePommelBagBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActivePommelBagBench; newDurability: number; isFunctional: boolean } {
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
