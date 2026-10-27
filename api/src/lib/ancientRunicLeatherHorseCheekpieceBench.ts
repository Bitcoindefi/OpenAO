import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Cheekpiece Bench, Mithril Bit Coupling Rig & Celestial Valkyrie Cheekpiece Sanctum Engine for OpenAO MMORPG.
 * Simulates headstall cheekpiece stitching benches and bit suspension tension rigs (Elder Cheekpiece Bench, Runic Ash Cheekpiece Rig, Celestial Void Valkyrie Cheekpiece Sanctum),
 * raw tanned buffalo cheekpiece straps and tempered mithril bit coupling sets (Tanned Buffalo Cheekpiece Strap, Tempered Mithril Bit Coupling Set, Celestial Void Astral Cheekpiece Pelt),
 * novice vertical suspension cheekpieces and sovereign aerial cheekpiece recipes (Novice Vertical Suspension Cheekpiece, Warmaster Mithril Coupled Cheekpiece, Celestial Void Valkyrie Sovereign Cheekpiece),
 * independent steed bit-alignment ratings and mouthpiece comfort ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped bit alignment bonus and mouthpiece comfort scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse cheekpiece bench maintenance.
 */

export type CheekpieceBenchType = "ELDER_CHEEKPIECE_BENCH" | "RUNIC_ASH_CHEEKPIECE_RIG" | "CELESTIAL_VOID_VALKYRIE_CHEEKPIECE_SANCTUM";
export type RawLeatherCheekpieceType = "TANNED_BUFFALO_CHEEKPIECE_STRAP" | "TEMPERED_MITHRIL_BIT_COUPLING_SET" | "CELESTIAL_VOID_ASTRAL_CHEEKPIECE_PELT";
export type CheekpieceRecipeType = "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE" | "WARMASTER_MITHRIL_COUPLED_CHEEKPIECE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHEEKPIECE";

export interface CheekpieceBenchData {
    benchType: CheekpieceBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    bitSuspensionBonusPercent: number;
}

export interface CheekpieceRecipeData {
    recipeType: CheekpieceRecipeType;
    requiredLeatherType: RawLeatherCheekpieceType;
    requiredLeatherCount: number;
    baseBitAlignmentPercent: number;
    baseMouthpieceComfortBonusPercent: number;
}

export interface ActiveCheekpieceBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CheekpieceBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCheekpiece {
    cheekpieceId: string;
    recipeType: CheekpieceRecipeType;
    finalBitAlignmentPercent: number;
    finalMouthpieceComfortBonusPercent: number;
    bitSuspensionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCheekpieceType;
    remainingProvidedLeathers: RawLeatherCheekpieceType[];
    craftedEpochMs: number;
}

export const CHEEKPIECE_BENCH_CATALOG: Record<CheekpieceBenchType, CheekpieceBenchData> = {
    ELDER_CHEEKPIECE_BENCH: { benchType: "ELDER_CHEEKPIECE_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, bitSuspensionBonusPercent: 14 },
    RUNIC_ASH_CHEEKPIECE_RIG: { benchType: "RUNIC_ASH_CHEEKPIECE_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, bitSuspensionBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CHEEKPIECE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CHEEKPIECE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, bitSuspensionBonusPercent: 40 },
};

export const CHEEKPIECE_RECIPE_CATALOG: Record<CheekpieceRecipeType, CheekpieceRecipeData> = {
    NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE: { recipeType: "NOVICE_VERTICAL_SUSPENSION_CHEEKPIECE", requiredLeatherType: "TANNED_BUFFALO_CHEEKPIECE_STRAP", requiredLeatherCount: 2, baseBitAlignmentPercent: 24, baseMouthpieceComfortBonusPercent: 14 },
    WARMASTER_MITHRIL_COUPLED_CHEEKPIECE: { recipeType: "WARMASTER_MITHRIL_COUPLED_CHEEKPIECE", requiredLeatherType: "TEMPERED_MITHRIL_BIT_COUPLING_SET", requiredLeatherCount: 2, baseBitAlignmentPercent: 50, baseMouthpieceComfortBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHEEKPIECE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CHEEKPIECE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CHEEKPIECE_PELT", requiredLeatherCount: 2, baseBitAlignmentPercent: 84, baseMouthpieceComfortBonusPercent: 64 },
};

export class AncientRunicLeatherHorseCheekpieceBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CHEEKPIECE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CHEEKPIECE_BENCH_CATALOG).map(b => b.bitSuspensionBonusPercent), 1),
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
     * Constructs and initializes a horse cheekpiece stitching bench or bit suspension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CheekpieceBenchType
    ): ActiveCheekpieceBench {
        const data = CHEEKPIECE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse cheekpiece bench type: ${String(benchType)}`);
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
     * Stitches and tensions vertical cheekpiece straps and tempered mithril bit coupling sets into horse cheekpieces.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCheekpiece(
        bench: ActiveCheekpieceBench,
        recipeType: CheekpieceRecipeType,
        providedLeathers: RawLeatherCheekpieceType[],
        craftRoll?: number,
        suspensionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; cheekpiece?: CraftedHorseCheekpiece; updatedBench?: ActiveCheekpieceBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCheekpieceType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse cheekpiece bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CHEEKPIECE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CHEEKPIECE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse cheekpiece recipe: ${String(recipeType)}` };
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
                reason: `Insufficient cheekpiece straps/bit coupling sets: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Cheekpiece strap misaligned: mithril bit coupling loop skewed under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent bit suspension score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSuspensionRoll = typeof suspensionRoll === "number" && Number.isFinite(suspensionRoll) ? Math.max(0, Math.min(1, suspensionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.bitSuspensionBonusPercent / maxBonus) * 20;
        const suspensionScore = Math.max(0, Math.min(100, Math.round(
            (safeSuspensionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((suspensionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalAlignment = Math.max(0, Math.min(100, Math.round(recipe.baseBitAlignmentPercent * qualityMultiplier)));
        const finalComfort = Math.max(0, Math.min(100, Math.round(recipe.baseMouthpieceComfortBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const cheekpiece: CraftedHorseCheekpiece = {
            cheekpieceId: `cheekpiece_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalBitAlignmentPercent: finalAlignment,
            finalMouthpieceComfortBonusPercent: finalComfort,
            bitSuspensionPercent: suspensionScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            cheekpiece,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse cheekpiece bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCheekpieceBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCheekpieceBench; newDurability: number; isFunctional: boolean } {
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
