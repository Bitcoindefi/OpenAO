import crypto from "node:crypto";

/**
 * Ancient Runic Cathedral Stained Glass, Prismatic Mural & Sanctuary Light Engine for OpenAO MMORPG.
 * Simulates glazier tables and cathedral kilns (Leadbound Glazier Table, Runic Cathedral Kiln, Celestial Void Prism Sanctum),
 * arcane colored glass sheets (Cobalt Arcane Glass, Crimson Dawn Glass, Celestial Void Prismatic Glass),
 * sanctuary window mural recipes (Sanctuary Rose Window, Archangel Dawn Mosaic, Celestial Void Oculus),
 * independent divine blessing ratings (0% to 100%), sanctuary heal aura and damage mitigation scaling,
 * upfront glass sheet inventory deduction on all craft attempts, cached static catalog maxima, and glazier table maintenance.
 */

export type GlazierTableType = "LEADBOUND_GLAZIER_TABLE" | "RUNIC_CATHEDRAL_KILN" | "CELESTIAL_VOID_PRISM_SANCTUM";
export type ArcaneGlassSheetType = "COBALT_ARCANE_GLASS" | "CRIMSON_DAWN_GLASS" | "CELESTIAL_VOID_PRISMATIC_GLASS";
export type SanctuaryWindowRecipeType = "SANCTUARY_ROSE_WINDOW" | "ARCHANGEL_DAWN_MOSAIC" | "CELESTIAL_VOID_OCULUS";

export interface GlazierTableData {
    tableType: GlazierTableType;
    maxDurability: number;
    glazieryPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    sanctityBonusPercent: number;
}

export interface SanctuaryWindowRecipeData {
    recipeType: SanctuaryWindowRecipeType;
    requiredGlassType: ArcaneGlassSheetType;
    requiredGlassCount: number;
    baseSanctuaryHealPerSec: number;
    baseDamageMitigationPercent: number;
}

export interface ActiveGlazierTable {
    tableId: string;
    glazierPlayerId: string;
    tableType: GlazierTableType;
    currentDurability: number;
    maxDurability: number;
    glazieryPower: number;
    isFunctional: boolean;
}

export interface CraftedSanctuaryWindow {
    windowId: string;
    recipeType: SanctuaryWindowRecipeType;
    finalSanctuaryHealPerSec: number;
    finalDamageMitigationPercent: number;
    divineBlessingPercent: number; // 0 to 100
    consumedGlassCount: number;
    consumedGlassType: ArcaneGlassSheetType;
    remainingProvidedSheets: ArcaneGlassSheetType[];
    craftedEpochMs: number;
}

export const GLAZIER_CATALOG: Record<GlazierTableType, GlazierTableData> = {
    LEADBOUND_GLAZIER_TABLE: { tableType: "LEADBOUND_GLAZIER_TABLE", maxDurability: 75, glazieryPower: 25, baseSuccessRatePercent: 85, sanctityBonusPercent: 10 },
    RUNIC_CATHEDRAL_KILN: { tableType: "RUNIC_CATHEDRAL_KILN", maxDurability: 170, glazieryPower: 65, baseSuccessRatePercent: 92, sanctityBonusPercent: 20 },
    CELESTIAL_VOID_PRISM_SANCTUM: { tableType: "CELESTIAL_VOID_PRISM_SANCTUM", maxDurability: 310, glazieryPower: 120, baseSuccessRatePercent: 99, sanctityBonusPercent: 35 },
};

export const WINDOW_RECIPE_CATALOG: Record<SanctuaryWindowRecipeType, SanctuaryWindowRecipeData> = {
    SANCTUARY_ROSE_WINDOW: { recipeType: "SANCTUARY_ROSE_WINDOW", requiredGlassType: "COBALT_ARCANE_GLASS", requiredGlassCount: 2, baseSanctuaryHealPerSec: 30, baseDamageMitigationPercent: 6 },
    ARCHANGEL_DAWN_MOSAIC: { recipeType: "ARCHANGEL_DAWN_MOSAIC", requiredGlassType: "CRIMSON_DAWN_GLASS", requiredGlassCount: 2, baseSanctuaryHealPerSec: 75, baseDamageMitigationPercent: 14 },
    CELESTIAL_VOID_OCULUS: { recipeType: "CELESTIAL_VOID_OCULUS", requiredGlassType: "CELESTIAL_VOID_PRISMATIC_GLASS", requiredGlassCount: 2, baseSanctuaryHealPerSec: 180, baseDamageMitigationPercent: 30 },
};

export class AncientRunicGlassStainedGlassMuralEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(GLAZIER_CATALOG).map(g => g.glazieryPower), 1),
        maxBonus: Math.max(...Object.values(GLAZIER_CATALOG).map(g => g.sanctityBonusPercent), 1),
    };

    /**
     * Constructs and initializes a glazier table or cathedral kiln.
     */
    public static constructTable(
        glazierPlayerId: string,
        tableType: GlazierTableType,
        currentEpochMs = Date.now()
    ): ActiveGlazierTable {
        const data = GLAZIER_CATALOG[tableType];
        if (!data) {
            throw new Error(`Unsupported glazier table type: ${String(tableType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            tableId: `glazier_${tableType.toLowerCase()}_${uuid}`,
            glazierPlayerId,
            tableType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            glazieryPower: data.glazieryPower,
            isFunctional: true,
        };
    }

    /**
     * Fuses arcane glass sheets into cathedral rose windows, archangel mosaics, and void oculus murals.
     */
    public static craftWindow(
        table: ActiveGlazierTable,
        recipeType: SanctuaryWindowRecipeType,
        providedSheets: ArcaneGlassSheetType[],
        craftRoll = Math.random(),
        blessingRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; window?: CraftedSanctuaryWindow; remainingDurability: number; remainingProvidedSheets?: ArcaneGlassSheetType[]; reason?: string } {
        if (!table || !table.isFunctional || table.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: table?.currentDurability ?? 0,
                reason: `Glazier table is cracked or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const tableData = GLAZIER_CATALOG[table.tableType];
        if (!tableData) {
            return { success: false, remainingDurability: table.currentDurability, reason: `Unknown table model: ${String(table.tableType)}` };
        }

        const recipe = WINDOW_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: table.currentDurability, reason: `Unknown window recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedSheets)) {
            return { success: false, remainingDurability: table.currentDurability, reason: "Invalid glass sheets array." };
        }

        // Count matching sheets
        const matchingCount = providedSheets.filter(s => s === recipe.requiredGlassType).length;
        if (matchingCount < recipe.requiredGlassCount) {
            return {
                success: false,
                remainingDurability: table.currentDurability,
                reason: `Insufficient glass sheets: requires ${recipe.requiredGlassCount}x ${recipe.requiredGlassType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        table.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (table.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            table.currentDurability = Math.max(0, table.currentDurability);
            table.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts to avoid free retries on failed crafts
        const remaining = [...providedSheets];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredGlassCount; i--) {
            if (remaining[i] === recipe.requiredGlassType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > tableData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: table.currentDurability,
                remainingProvidedSheets: remaining,
                reason: `Came soldering warped: lead came melted unevenly during kiln firing, rolled ${rollPercent.toFixed(1)}, needed <= ${tableData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent divine blessing score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBlessingRoll = Number.isFinite(blessingRoll) ? Math.max(0, Math.min(1, blessingRoll)) : Math.random();
        const powerRatio = Math.min(1.0, table.glazieryPower / maxPower);
        const bonusPoints = (tableData.sanctityBonusPercent / maxBonus) * 20;
        const blessingScore = Math.max(0, Math.min(100, Math.round(
            (safeBlessingRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((blessingScore / 100) * 0.4); // 0.8 to 1.2x

        const finalHeal = Math.round(recipe.baseSanctuaryHealPerSec * qualityMultiplier);
        const finalMitigation = Math.round(recipe.baseDamageMitigationPercent * qualityMultiplier);

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const window: CraftedSanctuaryWindow = {
            windowId: `mural_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalSanctuaryHealPerSec: finalHeal,
            finalDamageMitigationPercent: finalMitigation,
            divineBlessingPercent: blessingScore,
            consumedGlassCount: recipe.requiredGlassCount,
            consumedGlassType: recipe.requiredGlassType,
            remainingProvidedSheets: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            window,
            remainingDurability: table.currentDurability,
            remainingProvidedSheets: remaining,
        };
    }

    /**
     * Scrapes lead came flux and maintains glazier table.
     */
    public static maintainTable(
        table: ActiveGlazierTable,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!table) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        table.currentDurability = Math.min(table.maxDurability, table.currentDurability + amt);
        table.isFunctional = table.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: table.currentDurability,
            isFunctional: table.isFunctional,
        };
    }
}