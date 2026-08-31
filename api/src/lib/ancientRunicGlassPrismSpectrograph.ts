import crypto from "node:crypto";

/**
 * Ancient Runic Glass Prism Spectrograph, Triangular Dispersion Bench & Chromatic Light Engine for OpenAO MMORPG.
 * Simulates prism spectrograph benches and chromatic goniometers (Pine Prism Spectrograph Bench, Runic Brass Dispersion Goniometer, Celestial Void Prismatic Aurora Sanctum),
 * raw flint glass prisms and fluorite dispersion crystals (Flint Glass Triangular Prism, Fluorite Chromatic Dispersion Crystal, Celestial Void Rainbow Aurora Prism),
 * solar flare spectrographs and seraphic aurora recipes (Solar Flare Dispersion Spectrograph, Lunar Rainbow Chromatic Prism, Celestial Void Seraphic Aurora Spectrograph),
 * independent chromatic dispersion ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped magic pierce and clamped spell critical scaling,
 * upfront prism material deduction on all craft attempts, consistent remainingProvidedPrisms return shapes across all paths, cached static catalog maxima, crypto-secure default gameplay rolls, authoritative catalog power ratio without dead instance fields, and spectrograph bench maintenance.
 */

export type SpectrographBenchType = "PINE_PRISM_SPECTROGRAPH_BENCH" | "RUNIC_BRASS_DISPERSION_GONIOMETER" | "CELESTIAL_VOID_PRISMATIC_AURORA_SANCTUM";
export type RawTriangularPrismType = "FLINT_GLASS_TRIANGULAR_PRISM" | "FLUORITE_CHROMATIC_DISPERSION_CRYSTAL" | "CELESTIAL_VOID_RAINBOW_AURORA_PRISM";
export type ChromaticSpectrographRecipeType = "SOLAR_FLARE_DISPERSION_SPECTROGRAPH" | "LUNAR_RAINBOW_CHROMATIC_PRISM" | "CELESTIAL_VOID_SERAPHIC_AURORA_SPECTROGRAPH";

export interface SpectrographBenchData {
    benchType: SpectrographBenchType;
    maxDurability: number;
    glazieryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    chromaticBonusPercent: number;
}

export interface ChromaticSpectrographRecipeData {
    recipeType: ChromaticSpectrographRecipeType;
    requiredPrismType: RawTriangularPrismType;
    requiredPrismCount: number;
    baseMagicPiercePercent: number;
    baseChromaticSpellCriticalPercent: number;
}

export interface ActiveSpectrographBench {
    benchId: string;
    glazierPlayerId: string;
    benchType: SpectrographBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedChromaticSpectrograph {
    spectrographId: string;
    recipeType: ChromaticSpectrographRecipeType;
    finalMagicPiercePercent: number;
    finalChromaticSpellCriticalPercent: number;
    chromaticDispersionPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedPrismCount: number;
    consumedPrismType: RawTriangularPrismType;
    remainingProvidedPrisms: RawTriangularPrismType[];
    craftedEpochMs: number;
}

export const SPECTROGRAPH_BENCH_CATALOG: Record<SpectrographBenchType, SpectrographBenchData> = {
    PINE_PRISM_SPECTROGRAPH_BENCH: { benchType: "PINE_PRISM_SPECTROGRAPH_BENCH", maxDurability: 75, glazieryPower: 25, baseSuccessRatePercent: 85, chromaticBonusPercent: 10 },
    RUNIC_BRASS_DISPERSION_GONIOMETER: { benchType: "RUNIC_BRASS_DISPERSION_GONIOMETER", maxDurability: 170, glazieryPower: 65, baseSuccessRatePercent: 92, chromaticBonusPercent: 20 },
    CELESTIAL_VOID_PRISMATIC_AURORA_SANCTUM: { benchType: "CELESTIAL_VOID_PRISMATIC_AURORA_SANCTUM", maxDurability: 310, glazieryPower: 120, baseSuccessRatePercent: 99, chromaticBonusPercent: 35 },
};

export const SPECTROGRAPH_RECIPE_CATALOG: Record<ChromaticSpectrographRecipeType, ChromaticSpectrographRecipeData> = {
    SOLAR_FLARE_DISPERSION_SPECTROGRAPH: { recipeType: "SOLAR_FLARE_DISPERSION_SPECTROGRAPH", requiredPrismType: "FLINT_GLASS_TRIANGULAR_PRISM", requiredPrismCount: 2, baseMagicPiercePercent: 20, baseChromaticSpellCriticalPercent: 10 },
    LUNAR_RAINBOW_CHROMATIC_PRISM: { recipeType: "LUNAR_RAINBOW_CHROMATIC_PRISM", requiredPrismType: "FLUORITE_CHROMATIC_DISPERSION_CRYSTAL", requiredPrismCount: 2, baseMagicPiercePercent: 45, baseChromaticSpellCriticalPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_AURORA_SPECTROGRAPH: { recipeType: "CELESTIAL_VOID_SERAPHIC_AURORA_SPECTROGRAPH", requiredPrismType: "CELESTIAL_VOID_RAINBOW_AURORA_PRISM", requiredPrismCount: 2, baseMagicPiercePercent: 80, baseChromaticSpellCriticalPercent: 60 },
};

export class AncientRunicGlassPrismSpectrographEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SPECTROGRAPH_BENCH_CATALOG).map(b => b.glazieryPower), 1),
        maxBonus: Math.max(...Object.values(SPECTROGRAPH_BENCH_CATALOG).map(b => b.chromaticBonusPercent), 1),
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
     * Generates a cryptographically secure random float in [0, 1).
     */
    public static generateSecureRoll(): number {
        if (typeof crypto.randomInt === "function") {
            return crypto.randomInt(0, 1000000) / 1000000;
        }
        return crypto.randomBytes(4).readUInt32LE(0) / 0xffffffff;
    }

    /**
     * Constructs and initializes a prism spectrograph bench or dispersion goniometer.
     */
    public static constructBench(
        glazierPlayerId: string,
        benchType: SpectrographBenchType
    ): ActiveSpectrographBench {
        const data = SPECTROGRAPH_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported spectrograph bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            glazierPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Calibrates and grinds flint prisms into dispersion spectrographs and aurora chromatic devices.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static calibrateSpectrograph(
        bench: ActiveSpectrographBench,
        recipeType: ChromaticSpectrographRecipeType,
        providedPrisms: RawTriangularPrismType[],
        craftRoll?: number,
        dispersionRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; spectrograph?: CraftedChromaticSpectrograph; updatedBench?: ActiveSpectrographBench; remainingDurability: number; remainingProvidedPrisms: RawTriangularPrismType[]; reason?: string } {
        const fallbackPrisms = Array.isArray(providedPrisms) ? [...providedPrisms] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedPrisms: fallbackPrisms,
                reason: `Spectrograph bench is uncalibrated or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SPECTROGRAPH_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedPrisms: fallbackPrisms, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = SPECTROGRAPH_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedPrisms: fallbackPrisms, reason: `Unknown spectrograph recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedPrisms)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedPrisms: [], reason: "Invalid prisms array." };
        }

        // Count matching glass prisms
        const matchingCount = providedPrisms.filter(p => p === recipe.requiredPrismType).length;
        if (matchingCount < recipe.requiredPrismCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedPrisms: fallbackPrisms,
                reason: `Insufficient glass prism: requires ${recipe.requiredPrismCount}x ${recipe.requiredPrismType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        bench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            bench.currentDurability = Math.max(0, bench.currentDurability);
            bench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedPrisms];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredPrismCount; i--) {
            if (remaining[i] === recipe.requiredPrismType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = typeof craftRoll === "number" && Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : this.generateSecureRoll();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedPrisms: remaining,
                reason: `Prism chipped: chromatic aberration shattered prism apex, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent chromatic dispersion score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeDispersionRoll = typeof dispersionRoll === "number" && Number.isFinite(dispersionRoll) ? Math.max(0, Math.min(1, dispersionRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.glazieryPower / maxPower);
        const bonusPoints = (benchData.chromaticBonusPercent / maxBonus) * 20;
        const dispersionScore = Math.max(0, Math.min(100, Math.round(
            (safeDispersionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((dispersionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalPierce = Math.max(0, Math.min(100, Math.round(recipe.baseMagicPiercePercent * qualityMultiplier)));
        const finalCrit = Math.max(0, Math.min(100, Math.round(recipe.baseChromaticSpellCriticalPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const spectrograph: CraftedChromaticSpectrograph = {
            spectrographId: `spectrograph_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMagicPiercePercent: finalPierce,
            finalChromaticSpellCriticalPercent: finalCrit,
            chromaticDispersionPercent: dispersionScore,
            consumedPrismCount: recipe.requiredPrismCount,
            consumedPrismType: recipe.requiredPrismType,
            remainingProvidedPrisms: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            spectrograph,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedPrisms: remaining,
        };
    }

    /**
     * Re-collimates brass goniometers and maintains spectrograph bench.
     */
    public static maintainBench(
        bench: ActiveSpectrographBench,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        bench.currentDurability = Math.min(bench.maxDurability, bench.currentDurability + amt);
        bench.isFunctional = bench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: bench.currentDurability,
            isFunctional: bench.isFunctional,
        };
    }
}