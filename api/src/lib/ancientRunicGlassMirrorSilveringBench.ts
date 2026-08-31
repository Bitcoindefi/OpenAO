import crypto from "node:crypto";

/**
 * Ancient Runic Glass Mirror Silvering Bench, Mercury Foil Bed & Arcane Reflection Engine for OpenAO MMORPG.
 * Simulates mirror silvering benches and reflection beds (Pine Mirror Silvering Bench, Runic Silver Reflection Bed, Celestial Void True-Image Sanctum),
 * raw silica glass sheets and pure silver foils (Polished Float Glass Sheet, Pure Argentum Silver Foil, Celestial Void Starlight Mirror Plate),
 * scrying mirrors and vanity reflection recipes (Illusionist Scrying Mirror, Sunflare Blinding Compact, Celestial Void True-Image Vanity),
 * independent specular reflectance ratings (0% to 100%), clamped illusion reflection and clamped scrying divination scaling,
 * upfront glass material deduction on all craft attempts, consistent remainingProvidedGlass return shapes, cached static catalog maxima, authoritative catalog power ratio, and silvering bench maintenance.
 */

export type SilveringBenchType = "PINE_MIRROR_SILVERING_BENCH" | "RUNIC_SILVER_REFLECTION_BED" | "CELESTIAL_VOID_TRUE_IMAGE_SANCTUM";
export type RawGlassSheetType = "POLISHED_FLOAT_GLASS_SHEET" | "PURE_ARGENTUM_SILVER_FOIL" | "CELESTIAL_VOID_STARLIGHT_MIRROR_PLATE";
export type ArcaneMirrorRecipeType = "ILLUSIONIST_SCRYING_MIRROR" | "SUNFLARE_BLINDING_COMPACT" | "CELESTIAL_VOID_TRUE_IMAGE_VANITY";

export interface SilveringBenchData {
    benchType: SilveringBenchType;
    maxDurability: number;
    silveringPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    specularBonusPercent: number;
}

export interface ArcaneMirrorRecipeData {
    recipeType: ArcaneMirrorRecipeType;
    requiredGlassType: RawGlassSheetType;
    requiredGlassCount: number;
    baseIllusionReflectionPercent: number;
    baseScryingDivinationPercent: number;
}

export interface ActiveSilveringBench {
    benchId: string;
    glazierPlayerId: string;
    benchType: SilveringBenchType;
    currentDurability: number;
    maxDurability: number;
    silveringPower: number;
    isFunctional: boolean;
}

export interface CraftedArcaneMirror {
    mirrorId: string;
    recipeType: ArcaneMirrorRecipeType;
    finalIllusionReflectionPercent: number;
    finalScryingDivinationPercent: number;
    specularReflectancePercent: number; // 0 to 100
    consumedGlassCount: number;
    consumedGlassType: RawGlassSheetType;
    remainingProvidedGlass: RawGlassSheetType[];
    craftedEpochMs: number;
}

export const SILVERING_CATALOG: Record<SilveringBenchType, SilveringBenchData> = {
    PINE_MIRROR_SILVERING_BENCH: { benchType: "PINE_MIRROR_SILVERING_BENCH", maxDurability: 75, silveringPower: 25, baseSuccessRatePercent: 85, specularBonusPercent: 10 },
    RUNIC_SILVER_REFLECTION_BED: { benchType: "RUNIC_SILVER_REFLECTION_BED", maxDurability: 170, silveringPower: 65, baseSuccessRatePercent: 92, specularBonusPercent: 20 },
    CELESTIAL_VOID_TRUE_IMAGE_SANCTUM: { benchType: "CELESTIAL_VOID_TRUE_IMAGE_SANCTUM", maxDurability: 310, silveringPower: 120, baseSuccessRatePercent: 99, specularBonusPercent: 35 },
};

export const MIRROR_RECIPE_CATALOG: Record<ArcaneMirrorRecipeType, ArcaneMirrorRecipeData> = {
    ILLUSIONIST_SCRYING_MIRROR: { recipeType: "ILLUSIONIST_SCRYING_MIRROR", requiredGlassType: "POLISHED_FLOAT_GLASS_SHEET", requiredGlassCount: 2, baseIllusionReflectionPercent: 20, baseScryingDivinationPercent: 10 },
    SUNFLARE_BLINDING_COMPACT: { recipeType: "SUNFLARE_BLINDING_COMPACT", requiredGlassType: "PURE_ARGENTUM_SILVER_FOIL", requiredGlassCount: 2, baseIllusionReflectionPercent: 45, baseScryingDivinationPercent: 25 },
    CELESTIAL_VOID_TRUE_IMAGE_VANITY: { recipeType: "CELESTIAL_VOID_TRUE_IMAGE_VANITY", requiredGlassType: "CELESTIAL_VOID_STARLIGHT_MIRROR_PLATE", requiredGlassCount: 2, baseIllusionReflectionPercent: 85, baseScryingDivinationPercent: 60 },
};

export class AncientRunicGlassMirrorSilveringBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SILVERING_CATALOG).map(b => b.silveringPower), 1),
        maxBonus: Math.max(...Object.values(SILVERING_CATALOG).map(b => b.specularBonusPercent), 1),
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
     * Constructs and initializes a mirror silvering bench or mercury foil bed.
     */
    public static constructBench(
        glazierPlayerId: string,
        benchType: SilveringBenchType
    ): ActiveSilveringBench {
        const data = SILVERING_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported silvering bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            glazierPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            silveringPower: data.silveringPower,
            isFunctional: true,
        };
    }

    /**
     * Silver-plates raw silica glass sheets into scrying mirrors and vanity reflection plates.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static silverMirror(
        bench: ActiveSilveringBench,
        recipeType: ArcaneMirrorRecipeType,
        providedGlass: RawGlassSheetType[],
        craftRoll = Math.random(),
        specularRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; mirror?: CraftedArcaneMirror; updatedBench?: ActiveSilveringBench; remainingDurability: number; remainingProvidedGlass: RawGlassSheetType[]; reason?: string } {
        const fallbackGlass = Array.isArray(providedGlass) ? [...providedGlass] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedGlass: fallbackGlass,
                reason: `Silvering bench is oxidized or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = SILVERING_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedGlass: fallbackGlass, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = MIRROR_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, reason: `Unknown mirror recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedGlass)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedGlass: [], reason: "Invalid glass array." };
        }

        // Count matching glass sheets
        const matchingCount = providedGlass.filter(g => g === recipe.requiredGlassType).length;
        if (matchingCount < recipe.requiredGlassCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedGlass: fallbackGlass,
                reason: `Insufficient glass sheet: requires ${recipe.requiredGlassCount}x ${recipe.requiredGlassType}, provided ${matchingCount}.`,
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
                reason: `Silvering tarnished: chemical nitrate precipitate fogged specular backing, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent specular reflectance score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSpecularRoll = Number.isFinite(specularRoll) ? Math.max(0, Math.min(1, specularRoll)) : Math.random();
        const powerRatio = Math.min(1.0, benchData.silveringPower / maxPower);
        const bonusPoints = (benchData.specularBonusPercent / maxBonus) * 20;
        const specularScore = Math.max(0, Math.min(100, Math.round(
            (safeSpecularRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((specularScore / 100) * 0.4); // 0.8 to 1.2x

        const finalIllusion = Math.max(0, Math.min(100, Math.round(recipe.baseIllusionReflectionPercent * qualityMultiplier)));
        const finalScrying = Math.max(0, Math.min(100, Math.round(recipe.baseScryingDivinationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const mirror: CraftedArcaneMirror = {
            mirrorId: `mirror_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalIllusionReflectionPercent: finalIllusion,
            finalScryingDivinationPercent: finalScrying,
            specularReflectancePercent: specularScore,
            consumedGlassCount: recipe.requiredGlassCount,
            consumedGlassType: recipe.requiredGlassType,
            remainingProvidedGlass: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            mirror,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedGlass: remaining,
        };
    }

    /**
     * Neutralizes silver nitrate residues and maintains silvering bench.
     */
    public static maintainBench(
        bench: ActiveSilveringBench,
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