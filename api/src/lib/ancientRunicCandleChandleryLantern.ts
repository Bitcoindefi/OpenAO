import crypto from "node:crypto";

/**
 * Ancient Runic Chandlery Lantern, Prismatic Glass & Beacon Engine for OpenAO MMORPG.
 * Simulates chandler workbenches and lantern foundries (Pine Chandler Workbench, Runic Silver Lantern Foundry, Celestial Void Beacon Forge),
 * crafted wax cores (Pure Beeswax Core, Astral Golden Wax Core, Celestial Starfire Core),
 * lantern beacon recipes (Wanderer Brass Lantern, Wardstone Prismatic Beacon, Celestial Starfire Pharus),
 * independent illuminating brilliance ratings (0% to 100%), sight radius and stealth detection scaling,
 * wax core inventory deduction, cached static catalog maxima, and workbench maintenance.
 */

export type ChandlerWorkbenchType = "PINE_CHANDLER_WORKBENCH" | "RUNIC_SILVER_LANTERN_FOUNDRY" | "CELESTIAL_VOID_BEACON_FORGE";
export type CraftedWaxCoreType = "PURE_BEESWAX_CORE" | "ASTRAL_GOLDEN_WAX_CORE" | "CELESTIAL_STARFIRE_CORE";
export type LanternBeaconRecipeType = "WANDERER_BRASS_LANTERN" | "WARDSTONE_PRISMATIC_BEACON" | "CELESTIAL_STARFIRE_PHARUS";

export interface ChandlerWorkbenchData {
    workbenchType: ChandlerWorkbenchType;
    maxDurability: number;
    chandleryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    radianceBonusPercent: number;
}

export interface LanternBeaconRecipeData {
    recipeType: LanternBeaconRecipeType;
    requiredCoreType: CraftedWaxCoreType;
    requiredCoreCount: number;
    baseSightRadiusMeters: number;
    baseStealthDetectionPercent: number;
}

export interface ActiveChandlerWorkbench {
    workbenchId: string;
    chandlerPlayerId: string;
    workbenchType: ChandlerWorkbenchType;
    currentDurability: number;
    maxDurability: number;
    chandleryPower: number;
    isFunctional: boolean;
}

export interface CraftedLanternBeacon {
    lanternId: string;
    recipeType: LanternBeaconRecipeType;
    finalSightRadiusMeters: number;
    finalStealthDetectionPercent: number;
    illuminatingBrilliancePercent: number; // 0 to 100
    consumedCoreCount: number;
    consumedCoreType: CraftedWaxCoreType;
    remainingProvidedCores: CraftedWaxCoreType[];
    craftedEpochMs: number;
}

export const WORKBENCH_CATALOG: Record<ChandlerWorkbenchType, ChandlerWorkbenchData> = {
    PINE_CHANDLER_WORKBENCH: { workbenchType: "PINE_CHANDLER_WORKBENCH", maxDurability: 75, chandleryPower: 25, baseSuccessRatePercent: 85, radianceBonusPercent: 10 },
    RUNIC_SILVER_LANTERN_FOUNDRY: { workbenchType: "RUNIC_SILVER_LANTERN_FOUNDRY", maxDurability: 170, chandleryPower: 65, baseSuccessRatePercent: 92, radianceBonusPercent: 20 },
    CELESTIAL_VOID_BEACON_FORGE: { workbenchType: "CELESTIAL_VOID_BEACON_FORGE", maxDurability: 310, chandleryPower: 120, baseSuccessRatePercent: 99, radianceBonusPercent: 35 },
};

export const LANTERN_RECIPE_CATALOG: Record<LanternBeaconRecipeType, LanternBeaconRecipeData> = {
    WANDERER_BRASS_LANTERN: { recipeType: "WANDERER_BRASS_LANTERN", requiredCoreType: "PURE_BEESWAX_CORE", requiredCoreCount: 2, baseSightRadiusMeters: 20, baseStealthDetectionPercent: 5 },
    WARDSTONE_PRISMATIC_BEACON: { recipeType: "WARDSTONE_PRISMATIC_BEACON", requiredCoreType: "ASTRAL_GOLDEN_WAX_CORE", requiredCoreCount: 2, baseSightRadiusMeters: 45, baseStealthDetectionPercent: 15 },
    CELESTIAL_STARFIRE_PHARUS: { recipeType: "CELESTIAL_STARFIRE_PHARUS", requiredCoreType: "CELESTIAL_STARFIRE_CORE", requiredCoreCount: 2, baseSightRadiusMeters: 90, baseStealthDetectionPercent: 30 },
};

export class AncientRunicCandleChandleryLanternEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(WORKBENCH_CATALOG).map(w => w.chandleryPower), 1),
        maxBonus: Math.max(...Object.values(WORKBENCH_CATALOG).map(w => w.radianceBonusPercent), 1),
    };

    /**
     * Constructs and initializes a chandler workbench or lantern foundry.
     */
    public static constructWorkbench(
        chandlerPlayerId: string,
        workbenchType: ChandlerWorkbenchType,
        currentEpochMs = Date.now()
    ): ActiveChandlerWorkbench {
        const data = WORKBENCH_CATALOG[workbenchType];
        if (!data) {
            throw new Error(`Unsupported chandler workbench type: ${String(workbenchType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            workbenchId: `chandler_${workbenchType.toLowerCase()}_${uuid}`,
            chandlerPlayerId,
            workbenchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            chandleryPower: data.chandleryPower,
            isFunctional: true,
        };
    }

    /**
     * Assembles wax cores into lanterns, prismatic ward beacons, and starfire pharus towers.
     */
    public static craftLantern(
        workbench: ActiveChandlerWorkbench,
        recipeType: LanternBeaconRecipeType,
        providedCores: CraftedWaxCoreType[],
        craftRoll = Math.random(),
        brillianceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; lantern?: CraftedLanternBeacon; remainingDurability: number; reason?: string } {
        if (!workbench || !workbench.isFunctional || workbench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: workbench?.currentDurability ?? 0,
                reason: `Chandler workbench is misaligned or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = WORKBENCH_CATALOG[workbench.workbenchType];
        if (!benchData) {
            return { success: false, remainingDurability: workbench.currentDurability, reason: `Unknown workbench model: ${String(workbench.workbenchType)}` };
        }

        const recipe = LANTERN_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: workbench.currentDurability, reason: `Unknown lantern recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedCores)) {
            return { success: false, remainingDurability: workbench.currentDurability, reason: "Invalid wax cores array." };
        }

        // Count matching cores
        const matchingCount = providedCores.filter(c => c === recipe.requiredCoreType).length;
        if (matchingCount < recipe.requiredCoreCount) {
            return {
                success: false,
                remainingDurability: workbench.currentDurability,
                reason: `Insufficient wax cores: requires ${recipe.requiredCoreCount}x ${recipe.requiredCoreType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        workbench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (workbench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            workbench.currentDurability = Math.max(0, workbench.currentDurability);
            workbench.isFunctional = false;
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: workbench.currentDurability,
                reason: `Glass casing fractured: thermal expansion cracked prismatic lens, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent brilliance score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBrillianceRoll = Number.isFinite(brillianceRoll) ? Math.max(0, Math.min(1, brillianceRoll)) : Math.random();
        const powerRatio = Math.min(1.0, workbench.chandleryPower / maxPower);
        const bonusPoints = (benchData.radianceBonusPercent / maxBonus) * 20;
        const brillianceScore = Math.max(0, Math.min(100, Math.round(
            (safeBrillianceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((brillianceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSight = Math.round(recipe.baseSightRadiusMeters * qualityMultiplier);
        const finalStealth = Math.round(recipe.baseStealthDetectionPercent * qualityMultiplier);

        // Splice consumed cores out of cloned array
        const remaining = [...providedCores];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredCoreCount; i--) {
            if (remaining[i] === recipe.requiredCoreType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const lantern: CraftedLanternBeacon = {
            lanternId: `lantern_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSightRadiusMeters: finalSight,
            finalStealthDetectionPercent: finalStealth,
            illuminatingBrilliancePercent: brillianceScore,
            consumedCoreCount: recipe.requiredCoreCount,
            consumedCoreType: recipe.requiredCoreType,
            remainingProvidedCores: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            lantern,
            remainingDurability: workbench.currentDurability,
        };
    }

    /**
     * Polishes brass mirrors and maintains chandler workbench.
     */
    public static maintainWorkbench(
        workbench: ActiveChandlerWorkbench,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!workbench) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        workbench.currentDurability = Math.min(workbench.maxDurability, workbench.currentDurability + amt);
        workbench.isFunctional = workbench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: workbench.currentDurability,
            isFunctional: workbench.isFunctional,
        };
    }
}