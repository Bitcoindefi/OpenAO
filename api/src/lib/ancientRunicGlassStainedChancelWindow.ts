import crypto from "node:crypto";

/**
 * Ancient Runic Glass Stained Chancel Window, Lead Came Assembly & Holy Light Refraction Engine for OpenAO MMORPG.
 * Simulates stained window glazier benches and lead came easels (Cedar Window Assembly Bench, Runic Lead Came Easel, Celestial Void Chancel Sanctum),
 * stained glass rondels and flashed colored glass panes (Cathedral Blue Rondel, Ruby Red Flashed Glass Pane, Celestial Void Holy Light Plate),
 * chancel window and cathedral rose window recipes (Saint Benedict Protective Window, Sunburst Holy Blessing Chancel, Celestial Void Seraphic Rose Window),
 * independent holy sanctuary warding ratings (0% to 100%), clamped holy warding and clamped health regen aura scaling,
 * upfront glass material deduction on all craft attempts, consistent remainingProvidedGlass return shapes across all paths, cached static catalog maxima, authoritative catalog power ratio, and assembly easel maintenance.
 */

export type WindowAssemblyBenchType = "CEDAR_WINDOW_ASSEMBLY_BENCH" | "RUNIC_LEAD_CAME_EASEL" | "CELESTIAL_VOID_CHANCEL_SANCTUM";
export type RawStainedGlassType = "CATHEDRAL_BLUE_RONDEL" | "RUBY_RED_FLASHED_GLASS_PANE" | "CELESTIAL_VOID_HOLY_LIGHT_PLATE";
export type ChancelWindowRecipeType = "SAINT_BENEDICT_PROTECTIVE_WINDOW" | "SUNBURST_HOLY_BLESSING_CHANCEL" | "CELESTIAL_VOID_SERAPHIC_ROSE_WINDOW";

export interface WindowAssemblyBenchData {
    benchType: WindowAssemblyBenchType;
    maxDurability: number;
    glazieryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    sanctityBonusPercent: number;
}

export interface ChancelWindowRecipeData {
    recipeType: ChancelWindowRecipeType;
    requiredGlassType: RawStainedGlassType;
    requiredGlassCount: number;
    baseHolyWardingPercent: number;
    baseHealthRegenAuraPercent: number;
}

export interface ActiveWindowAssemblyBench {
    benchId: string;
    glazierPlayerId: string;
    benchType: WindowAssemblyBenchType;
    currentDurability: number;
    maxDurability: number;
    glazieryPower: number;
    isFunctional: boolean;
}

export interface CraftedChancelWindow {
    windowId: string;
    recipeType: ChancelWindowRecipeType;
    finalHolyWardingPercent: number;
    finalHealthRegenAuraPercent: number;
    sanctuarySanctityPercent: number; // 0 to 100
    consumedGlassCount: number;
    consumedGlassType: RawStainedGlassType;
    remainingProvidedGlass: RawStainedGlassType[];
    craftedEpochMs: number;
}

export const CHANCEL_BENCH_CATALOG: Record<WindowAssemblyBenchType, WindowAssemblyBenchData> = {
    CEDAR_WINDOW_ASSEMBLY_BENCH: { benchType: "CEDAR_WINDOW_ASSEMBLY_BENCH", maxDurability: 75, glazieryPower: 25, baseSuccessRatePercent: 85, sanctityBonusPercent: 10 },
    RUNIC_LEAD_CAME_EASEL: { benchType: "RUNIC_LEAD_CAME_EASEL", maxDurability: 170, glazieryPower: 65, baseSuccessRatePercent: 92, sanctityBonusPercent: 20 },
    CELESTIAL_VOID_CHANCEL_SANCTUM: { benchType: "CELESTIAL_VOID_CHANCEL_SANCTUM", maxDurability: 310, glazieryPower: 120, baseSuccessRatePercent: 99, sanctityBonusPercent: 35 },
};

export const CHANCEL_RECIPE_CATALOG: Record<ChancelWindowRecipeType, ChancelWindowRecipeData> = {
    SAINT_BENEDICT_PROTECTIVE_WINDOW: { recipeType: "SAINT_BENEDICT_PROTECTIVE_WINDOW", requiredGlassType: "CATHEDRAL_BLUE_RONDEL", requiredGlassCount: 2, baseHolyWardingPercent: 20, baseHealthRegenAuraPercent: 10 },
    SUNBURST_HOLY_BLESSING_CHANCEL: { recipeType: "SUNBURST_HOLY_BLESSING_CHANCEL", requiredGlassType: "RUBY_RED_FLASHED_GLASS_PANE", requiredGlassCount: 2, baseHolyWardingPercent: 45, baseHealthRegenAuraPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_ROSE_WINDOW: { recipeType: "CELESTIAL_VOID_SERAPHIC_ROSE_WINDOW", requiredGlassType: "CELESTIAL_VOID_HOLY_LIGHT_PLATE", requiredGlassCount: 2, baseHolyWardingPercent: 85, baseHealthRegenAuraPercent: 60 },
};

export class AncientRunicGlassStainedChancelWindowEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(CHANCEL_BENCH_CATALOG).map(b => b.glazieryPower), 1),
        maxBonus: Math.max(...Object.values(CHANCEL_BENCH_CATALOG).map(b => b.sanctityBonusPercent), 1),
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
     * Constructs and initializes a stained glass window assembly bench or lead came easel.
     */
    public static constructBench(
        glazierPlayerId: string,
        benchType: WindowAssemblyBenchType
    ): ActiveWindowAssemblyBench {
        const data = CHANCEL_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported window assembly bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            glazierPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            glazieryPower: data.glazieryPower,
            isFunctional: true,
        };
    }

    /**
     * Assembles and solders stained glass rondels into cathedral chancel windows and rose windows.
     * Note: Mutates the passed `bench` in place and returns it as `updatedBench` for caller ergonomics.
     */
    public static assembleWindow(
        bench: ActiveWindowAssemblyBench,
        recipeType: ChancelWindowRecipeType,
        providedGlass: RawStainedGlassType[],
        craftRoll = Math.random(),
        sanctityRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; window?: CraftedChancelWindow; updatedBench?: ActiveWindowAssemblyBench; remainingDurability: number; remainingProvidedGlass: RawStainedGlassType[]; reason?: string } {
        const fallbackGlass = Array.isArray(providedGlass) ? [...providedGlass] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedGlass: fallbackGlass,
                reason: `Window assembly bench is rickety or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = CHANCEL_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedGlass: fallbackGlass, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = CHANCEL_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedGlass: fallbackGlass, reason: `Unknown chancel recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedGlass)) {
            return { success: false, updatedBench: bench, remainingDurability: bench.currentDurability, remainingProvidedGlass: [], reason: "Invalid glass array." };
        }

        // Count matching glass panes
        const matchingCount = providedGlass.filter(g => g === recipe.requiredGlassType).length;
        if (matchingCount < recipe.requiredGlassCount) {
            return {
                success: false,
                updatedBench: bench,
                remainingDurability: bench.currentDurability,
                remainingProvidedGlass: fallbackGlass,
                reason: `Insufficient glass pane: requires ${recipe.requiredGlassCount}x ${recipe.requiredGlassType}, provided ${matchingCount}.`,
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
                reason: `Lead came buckled: solder seam warped under iron heat, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent sanctuary sanctity score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeSanctityRoll = Number.isFinite(sanctityRoll) ? Math.max(0, Math.min(1, sanctityRoll)) : Math.random();
        const powerRatio = Math.min(1.0, benchData.glazieryPower / maxPower);
        const bonusPoints = (benchData.sanctityBonusPercent / maxBonus) * 20;
        const sanctityScore = Math.max(0, Math.min(100, Math.round(
            (safeSanctityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((sanctityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalWarding = Math.max(0, Math.min(100, Math.round(recipe.baseHolyWardingPercent * qualityMultiplier)));
        const finalRegen = Math.max(0, Math.min(100, Math.round(recipe.baseHealthRegenAuraPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const chancelWindow: CraftedChancelWindow = {
            windowId: `window_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalHolyWardingPercent: finalWarding,
            finalHealthRegenAuraPercent: finalRegen,
            sanctuarySanctityPercent: sanctityScore,
            consumedGlassCount: recipe.requiredGlassCount,
            consumedGlassType: recipe.requiredGlassType,
            remainingProvidedGlass: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            window: chancelWindow,
            updatedBench: bench,
            remainingDurability: bench.currentDurability,
            remainingProvidedGlass: remaining,
        };
    }

    /**
     * Re-leads came tracks and maintains window assembly bench.
     */
    public static maintainBench(
        bench: ActiveWindowAssemblyBench,
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