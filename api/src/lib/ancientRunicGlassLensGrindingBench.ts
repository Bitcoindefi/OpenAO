import crypto from "node:crypto";

/**
 * Ancient Runic Glass Lens Grinding Bench, Optical Lap & Arcane Telescope Engine for OpenAO MMORPG.
 * Simulates optical grinding benches and laps (Cedar Lens Grinding Bench, Runic Brass Optical Lap, Celestial Void Stargazer Sanctum),
 * raw silica glass disks and crystal prisms (Flint Glass Blank, Quartz Crystal Prism, Celestial Void Starlight Disk),
 * optical lens and stargazer telescope recipes (Surveyor Spyglass Lens, Astrologer Sextant Prism, Celestial Void Stargazer Monocular),
 * independent optical clarity ratings (0% to 100%), clamped reconnaissance range and clamped true sight detection scaling,
 * upfront glass material deduction on all craft attempts, cached static catalog maxima, authoritative catalog power ratio, and grinding bench maintenance.
 */

export type GrindingBenchType = "CEDAR_LENS_GRINDING_BENCH" | "RUNIC_BRASS_OPTICAL_LAP" | "CELESTIAL_VOID_STARGAZER_SANCTUM";
export type RawGlassDiskType = "FLINT_GLASS_BLANK" | "QUARTZ_CRYSTAL_PRISM" | "CELESTIAL_VOID_STARLIGHT_DISK";
export type OpticalLensRecipeType = "SURVEYOR_SPYGLASS_LENS" | "ASTROLOGER_SEXTANT_PRISM" | "CELESTIAL_VOID_STARGAZER_MONOCULAR";

export interface GrindingBenchData {
    benchType: GrindingBenchType;
    maxDurability: number;
    grindingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    focalBonusPercent: number;
}

export interface OpticalLensRecipeData {
    recipeType: OpticalLensRecipeType;
    requiredGlassType: RawGlassDiskType;
    requiredGlassCount: number;
    baseReconnaissanceRangePercent: number;
    baseTrueSightDetectionPercent: number;
}

export interface ActiveGrindingBench {
    benchId: string;
    opticianPlayerId: string;
    benchType: GrindingBenchType;
    currentDurability: number;
    maxDurability: number;
    grindingPower: number;
    isFunctional: boolean;
}

export interface CraftedOpticalLens {
    lensId: string;
    recipeType: OpticalLensRecipeType;
    finalReconnaissanceRangePercent: number;
    finalTrueSightDetectionPercent: number;
    opticalClarityPercent: number; // 0 to 100
    consumedGlassCount: number;
    consumedGlassType: RawGlassDiskType;
    remainingProvidedGlass: RawGlassDiskType[];
    craftedEpochMs: number;
}

export const BENCH_CATALOG: Record<GrindingBenchType, GrindingBenchData> = {
    CEDAR_LENS_GRINDING_BENCH: { benchType: "CEDAR_LENS_GRINDING_BENCH", maxDurability: 75, grindingPower: 25, baseSuccessRatePercent: 85, focalBonusPercent: 10 },
    RUNIC_BRASS_OPTICAL_LAP: { benchType: "RUNIC_BRASS_OPTICAL_LAP", maxDurability: 170, grindingPower: 65, baseSuccessRatePercent: 92, focalBonusPercent: 20 },
    CELESTIAL_VOID_STARGAZER_SANCTUM: { benchType: "CELESTIAL_VOID_STARGAZER_SANCTUM", maxDurability: 310, grindingPower: 120, baseSuccessRatePercent: 99, focalBonusPercent: 35 },
};

export const OPTICAL_RECIPE_CATALOG: Record<OpticalLensRecipeType, OpticalLensRecipeData> = {
    SURVEYOR_SPYGLASS_LENS: { recipeType: "SURVEYOR_SPYGLASS_LENS", requiredGlassType: "FLINT_GLASS_BLANK", requiredGlassCount: 2, baseReconnaissanceRangePercent: 20, baseTrueSightDetectionPercent: 10 },
    ASTROLOGER_SEXTANT_PRISM: { recipeType: "ASTROLOGER_SEXTANT_PRISM", requiredGlassType: "QUARTZ_CRYSTAL_PRISM", requiredGlassCount: 2, baseReconnaissanceRangePercent: 45, baseTrueSightDetectionPercent: 25 },
    CELESTIAL_VOID_STARGAZER_MONOCULAR: { recipeType: "CELESTIAL_VOID_STARGAZER_MONOCULAR", requiredGlassType: "CELESTIAL_VOID_STARLIGHT_DISK", requiredGlassCount: 2, baseReconnaissanceRangePercent: 85, baseTrueSightDetectionPercent: 60 },
};

export class AncientRunicGlassLensGrindingBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(BENCH_CATALOG).map(b => b.grindingPower), 1),
        maxBonus: Math.max(...Object.values(BENCH_CATALOG).map(b => b.focalBonusPercent), 1),
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
     * Constructs and initializes an optical grinding bench or lapidary lap.
     */
    public static constructBench(
        opticianPlayerId: string,
        benchType: GrindingBenchType
    ): ActiveGrindingBench {
        const data = BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported grinding bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            opticianPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            grindingPower: data.grindingPower,
            isFunctional: true,
        };
    }

    /**
     * Grinds and polishes raw silica glass blanks into spyglasses, prisms, and stargazer monoculars.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static grindLens(
        bench: ActiveGrindingBench,
        recipeType: OpticalLensRecipeType,
        providedGlass: RawGlassDiskType[],
        craftRoll = Math.random(),
        clarityRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; lens?: CraftedOpticalLens; updatedBench?: ActiveGrindingBench; remainingDurability: number; remainingProvidedGlass?: RawGlassDiskType[]; reason?: string } {
        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                reason: `Grinding bench is wobbling or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = OPTICAL_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, reason: `Unknown optical recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedGlass)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, reason: "Invalid glass array." };
        }

        // Count matching glass blanks
        const matchingCount = providedGlass.filter(g => g === recipe.requiredGlassType).length;
        if (matchingCount < recipe.requiredGlassCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                reason: `Insufficient glass: requires ${recipe.requiredGlassCount}x ${recipe.requiredGlassType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        bench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            bench.currentDurability = Math.max(0, bench.currentDurability);
            bench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedGlass];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredGlassCount; i--) {
            if (remaining[i] === recipe.requiredGlassType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedGlass: remaining,
                reason: `Glass disk pitted: emery abrasive grit scratched optical curvature, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent optical clarity score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeClarityRoll = Number.isFinite(clarityRoll) ? Math.max(0, Math.min(1, clarityRoll)) : Math.random();
        const powerRatio = Math.min(1.0, benchData.grindingPower / maxPower);
        const bonusPoints = (benchData.focalBonusPercent / maxBonus) * 20;
        const clarityScore = Math.max(0, Math.min(100, Math.round(
            (safeClarityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((clarityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalRecon = Math.max(0, Math.min(100, Math.round(recipe.baseReconnaissanceRangePercent * qualityMultiplier)));
        const finalSight = Math.max(0, Math.min(100, Math.round(recipe.baseTrueSightDetectionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const lens: CraftedOpticalLens = {
            lensId: `lens_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalReconnaissanceRangePercent: finalRecon,
            finalTrueSightDetectionPercent: finalSight,
            opticalClarityPercent: clarityScore,
            consumedGlassCount: recipe.requiredGlassCount,
            consumedGlassType: recipe.requiredGlassType,
            remainingProvidedGlass: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            lens,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedGlass: remaining,
        };
    }

    /**
     * Re-surfaces pitch laps and maintains grinding bench.
     */
    public static maintainBench(
        bench: ActiveGrindingBench,
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