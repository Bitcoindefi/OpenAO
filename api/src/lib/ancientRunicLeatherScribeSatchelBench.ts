import crypto from "node:crypto";

/**
 * Ancient Runic Leather Scribe Satchel Bench, Ink-Proof Wax Seal & Scroll Pouch Engine for OpenAO MMORPG.
 * Simulates scribe satchel stitching benches and wax seal presses (Oak Scribe Satchel Bench, Runic Ironwood Document Rig, Celestial Void Seraphic Archivist Sanctum),
 * raw tanned calfskin satchel blanks and enchanted waterproof wax cakes (Tanned Calfskin Satchel Blank, Enchanted Waterproof Wax Cake, Celestial Void Starlight Archivist Leather),
 * moisture-proof scroll pouches and seraphic grimoire haversack recipes (Apprentice Moisture-Proof Scroll Pouch, Scholar Multi-Tier Document Satchel, Celestial Void Seraphic Bottomless Grimoire Haversack),
 * independent parchment preservation & scroll retrieval ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped scroll mana cost reduction and clamped scroll acid/water damage mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and satchel bench maintenance.
 */

export type SatchelBenchType = "OAK_SCRIBE_SATCHEL_BENCH" | "RUNIC_IRONWOOD_DOCUMENT_RIG" | "CELESTIAL_VOID_SERAPHIC_ARCHIVIST_SANCTUM";
export type RawLeatherSatchelType = "TANNED_CALFSKIN_SATCHEL_BLANK" | "ENCHANTED_WATERPROOF_WAX_CAKE" | "CELESTIAL_VOID_STARLIGHT_ARCHIVIST_LEATHER";
export type ScrollSatchelRecipeType = "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH" | "SCHOLAR_MULTI_TIER_DOCUMENT_SATCHEL" | "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_GRIMOIRE_HAVERSACK";

export interface SatchelBenchData {
    benchType: SatchelBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    quickcastBonusPercent: number;
}

export interface ScrollSatchelRecipeData {
    recipeType: ScrollSatchelRecipeType;
    requiredLeatherType: RawLeatherSatchelType;
    requiredLeatherCount: number;
    baseScrollManaCostReductionPercent: number;
    baseScrollDamageMitigationPercent: number;
}

export interface ActiveSatchelBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: SatchelBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedScrollSatchel {
    satchelId: string;
    recipeType: ScrollSatchelRecipeType;
    finalScrollManaCostReductionPercent: number;
    finalScrollDamageMitigationPercent: number;
    retrievalFluidityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherSatchelType;
    remainingProvidedLeathers: RawLeatherSatchelType[];
    craftedEpochMs: number;
}

export const SATCHEL_BENCH_CATALOG: Record<SatchelBenchType, SatchelBenchData> = {
    OAK_SCRIBE_SATCHEL_BENCH: { benchType: "OAK_SCRIBE_SATCHEL_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, quickcastBonusPercent: 10 },
    RUNIC_IRONWOOD_DOCUMENT_RIG: { benchType: "RUNIC_IRONWOOD_DOCUMENT_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, quickcastBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_ARCHIVIST_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_ARCHIVIST_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, quickcastBonusPercent: 35 },
};

export const SATCHEL_RECIPE_CATALOG: Record<ScrollSatchelRecipeType, ScrollSatchelRecipeData> = {
    APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH: { recipeType: "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH", requiredLeatherType: "TANNED_CALFSKIN_SATCHEL_BLANK", requiredLeatherCount: 2, baseScrollManaCostReductionPercent: 20, baseScrollDamageMitigationPercent: 10 },
    SCHOLAR_MULTI_TIER_DOCUMENT_SATCHEL: { recipeType: "SCHOLAR_MULTI_TIER_DOCUMENT_SATCHEL", requiredLeatherType: "ENCHANTED_WATERPROOF_WAX_CAKE", requiredLeatherCount: 2, baseScrollManaCostReductionPercent: 45, baseScrollDamageMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_GRIMOIRE_HAVERSACK: { recipeType: "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_GRIMOIRE_HAVERSACK", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_ARCHIVIST_LEATHER", requiredLeatherCount: 2, baseScrollManaCostReductionPercent: 80, baseScrollDamageMitigationPercent: 60 },
};

export class AncientRunicLeatherScribeSatchelBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SATCHEL_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(SATCHEL_BENCH_CATALOG).map(b => b.quickcastBonusPercent), 1),
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
     * Constructs and initializes a scribe satchel stitching bench or archivist rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: SatchelBenchType
    ): ActiveSatchelBench {
        const data = SATCHEL_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported satchel bench type: ${String(benchType)}`);
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
     * Stitches and wax-seals calfskin satchel blanks and enchanted wax into scroll satchels.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftSatchel(
        bench: ActiveSatchelBench,
        recipeType: ScrollSatchelRecipeType,
        providedLeathers: RawLeatherSatchelType[],
        craftRoll?: number,
        fluidityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; satchel?: CraftedScrollSatchel; updatedBench?: ActiveSatchelBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherSatchelType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Scribe satchel bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SATCHEL_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SATCHEL_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown satchel recipe: ${String(recipeType)}` };
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
                reason: `Insufficient satchel leather/wax: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Pouch scorched: wax sealant iron overheated and blistered calfskin partition, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent retrieval fluidity score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeFluidityRoll = typeof fluidityRoll === "number" && Number.isFinite(fluidityRoll) ? Math.max(0, Math.min(1, fluidityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.quickcastBonusPercent / maxBonus) * 20;
        const fluidityScore = Math.max(0, Math.min(100, Math.round(
            (safeFluidityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((fluidityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalManaReduction = Math.max(0, Math.min(100, Math.round(recipe.baseScrollManaCostReductionPercent * qualityMultiplier)));
        const finalDamageMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseScrollDamageMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const satchel: CraftedScrollSatchel = {
            satchelId: `satchel_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalScrollManaCostReductionPercent: finalManaReduction,
            finalScrollDamageMitigationPercent: finalDamageMitigate,
            retrievalFluidityPercent: fluidityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            satchel,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-calibrates wax seal heating element and maintains scribe satchel bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveSatchelBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveSatchelBench; newDurability: number; isFunctional: boolean } {
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