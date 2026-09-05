import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Crownpiece Bench, Mithril Poll Padding Rig & Celestial Valkyrie Crownpiece Sanctum Engine for OpenAO MMORPG.
 * Simulates headstall crownpiece stitching benches and poll relief tension rigs (Elder Crownpiece Bench, Runic Ash Crownpiece Rig, Celestial Void Valkyrie Crownpiece Sanctum),
 * raw tanned buffalo crownpiece straps and tempered mithril poll padding sets (Tanned Buffalo Crownpiece Strap, Tempered Mithril Poll Padding Set, Celestial Void Astral Crownpiece Pelt),
 * novice anatomical poll crownpieces and sovereign aerial crownpiece recipes (Novice Anatomical Poll Crownpiece, Warmaster Mithril Padded Crownpiece, Celestial Void Valkyrie Sovereign Crownpiece),
 * independent steed poll-comfort ratings and bit responsiveness ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped poll comfort bonus and bit responsiveness scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse crownpiece bench maintenance.
 */

export type CrownpieceBenchType = "ELDER_CROWNPIECE_BENCH" | "RUNIC_ASH_CROWNPIECE_RIG" | "CELESTIAL_VOID_VALKYRIE_CROWNPIECE_SANCTUM";
export type RawLeatherCrownpieceType = "TANNED_BUFFALO_CROWNPIECE_STRAP" | "TEMPERED_MITHRIL_POLL_PADDING_SET" | "CELESTIAL_VOID_ASTRAL_CROWNPIECE_PELT";
export type CrownpieceRecipeType = "NOVICE_ANATOMICAL_POLL_CROWNPIECE" | "WARMASTER_MITHRIL_PADDED_CROWNPIECE" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CROWNPIECE";

export interface CrownpieceBenchData {
    benchType: CrownpieceBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    pollPressureReliefBonusPercent: number;
}

export interface CrownpieceRecipeData {
    recipeType: CrownpieceRecipeType;
    requiredLeatherType: RawLeatherCrownpieceType;
    requiredLeatherCount: number;
    basePollComfortPercent: number;
    baseBitResponsivenessBonusPercent: number;
}

export interface ActiveCrownpieceBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: CrownpieceBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseCrownpiece {
    crownpieceId: string;
    recipeType: CrownpieceRecipeType;
    finalPollComfortPercent: number;
    finalBitResponsivenessBonusPercent: number;
    pollPressureReliefPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherCrownpieceType;
    remainingProvidedLeathers: RawLeatherCrownpieceType[];
    craftedEpochMs: number;
}

export const CROWNPIECE_BENCH_CATALOG: Record<CrownpieceBenchType, CrownpieceBenchData> = {
    ELDER_CROWNPIECE_BENCH: { benchType: "ELDER_CROWNPIECE_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, pollPressureReliefBonusPercent: 14 },
    RUNIC_ASH_CROWNPIECE_RIG: { benchType: "RUNIC_ASH_CROWNPIECE_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, pollPressureReliefBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_CROWNPIECE_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_CROWNPIECE_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, pollPressureReliefBonusPercent: 40 },
};

export const CROWNPIECE_RECIPE_CATALOG: Record<CrownpieceRecipeType, CrownpieceRecipeData> = {
    NOVICE_ANATOMICAL_POLL_CROWNPIECE: { recipeType: "NOVICE_ANATOMICAL_POLL_CROWNPIECE", requiredLeatherType: "TANNED_BUFFALO_CROWNPIECE_STRAP", requiredLeatherCount: 2, basePollComfortPercent: 24, baseBitResponsivenessBonusPercent: 14 },
    WARMASTER_MITHRIL_PADDED_CROWNPIECE: { recipeType: "WARMASTER_MITHRIL_PADDED_CROWNPIECE", requiredLeatherType: "TEMPERED_MITHRIL_POLL_PADDING_SET", requiredLeatherCount: 2, basePollComfortPercent: 50, baseBitResponsivenessBonusPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CROWNPIECE: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_CROWNPIECE", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_CROWNPIECE_PELT", requiredLeatherCount: 2, basePollComfortPercent: 84, baseBitResponsivenessBonusPercent: 64 },
};

export class AncientRunicLeatherHorseCrownpieceBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CROWNPIECE_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(CROWNPIECE_BENCH_CATALOG).map(b => b.pollPressureReliefBonusPercent), 1),
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
     * Constructs and initializes a horse crownpiece stitching bench or poll relief rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: CrownpieceBenchType
    ): ActiveCrownpieceBench {
        const data = CROWNPIECE_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse crownpiece bench type: ${String(benchType)}`);
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
     * Stitches and tensions crownpiece straps and tempered mithril poll padding sets into horse crownpieces.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftCrownpiece(
        bench: ActiveCrownpieceBench,
        recipeType: CrownpieceRecipeType,
        providedLeathers: RawLeatherCrownpieceType[],
        craftRoll?: number,
        reliefRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; crownpiece?: CraftedHorseCrownpiece; updatedBench?: ActiveCrownpieceBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherCrownpieceType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse crownpiece bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CROWNPIECE_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CROWNPIECE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse crownpiece recipe: ${String(recipeType)}` };
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
                reason: `Insufficient crownpiece straps/poll padding: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Crownpiece strap misaligned: mithril poll padding shifted under clamping frame, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent poll pressure relief score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeReliefRoll = typeof reliefRoll === "number" && Number.isFinite(reliefRoll) ? Math.max(0, Math.min(1, reliefRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.pollPressureReliefBonusPercent / maxBonus) * 20;
        const reliefScore = Math.max(0, Math.min(100, Math.round(
            (safeReliefRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((reliefScore / 100) * 0.4); // 0.8 to 1.2x

        const finalComfort = Math.max(0, Math.min(100, Math.round(recipe.basePollComfortPercent * qualityMultiplier)));
        const finalBitBonus = Math.max(0, Math.min(100, Math.round(recipe.baseBitResponsivenessBonusPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const crownpiece: CraftedHorseCrownpiece = {
            crownpieceId: `crownpiece_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPollComfortPercent: finalComfort,
            finalBitResponsivenessBonusPercent: finalBitBonus,
            pollPressureReliefPercent: reliefScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            crownpiece,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse crownpiece bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveCrownpieceBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveCrownpieceBench; newDurability: number; isFunctional: boolean } {
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
