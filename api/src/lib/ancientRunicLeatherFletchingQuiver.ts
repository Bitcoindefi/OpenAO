import crypto from "node:crypto";

/**
 * Ancient Runic Fletching, Arcane Quiver & Crossbow Bolt Pouch Engine for OpenAO MMORPG.
 * Simulates fletching tables and leather stitchers (Yew Fletching Table, Runic Mithril Leather Stitcher, Celestial Void Fletcher Sanctum),
 * cured beast leathers and arcane plumage (Supple Stalker Leather, Phoenix Feather Crest, Celestial Void Raptor Plume),
 * quiver and bolt pouch recipes (Windrunner Ranger Quiver, Phoenixfire Crossbow Pouch, Celestial Voidfang Endless Quiver),
 * independent craftsmanship ratings (0% to 100%), arrow capacity and reload speed haste scaling,
 * upfront material deduction on all craft attempts, cached static catalog maxima, and fletching table maintenance.
 */

export type FletchingTableType = "YEW_FLETCHING_TABLE" | "RUNIC_MITHRIL_LEATHER_STITCHER" | "CELESTIAL_VOID_FLETCHER_SANCTUM";
export type FletchingMaterialType = "SUPPLE_STALKER_LEATHER" | "PHOENIX_FEATHER_CREST" | "CELESTIAL_VOID_RAPTOR_PLUME";
export type QuiverPouchRecipeType = "WINDRUNNER_RANGER_QUIVER" | "PHOENIXFIRE_CROSSBOW_POUCH" | "CELESTIAL_VOIDFANG_ENDLESS_QUIVER";

export interface FletchingTableData {
    tableType: FletchingTableType;
    maxDurability: number;
    fletchingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    capacityBonusPercent: number;
}

export interface QuiverPouchRecipeData {
    recipeType: QuiverPouchRecipeType;
    requiredMaterialType: FletchingMaterialType;
    requiredMaterialCount: number;
    baseArrowCapacity: number;
    baseReloadSpeedHastePercent: number;
}

export interface ActiveFletchingTable {
    tableId: string;
    fletcherPlayerId: string;
    tableType: FletchingTableType;
    currentDurability: number;
    maxDurability: number;
    fletchingPower: number;
    isFunctional: boolean;
}

export interface CraftedQuiverPouch {
    quiverId: string;
    recipeType: QuiverPouchRecipeType;
    finalArrowCapacity: number;
    finalReloadSpeedHastePercent: number;
    craftsmanshipPercent: number; // 0 to 100
    consumedMaterialCount: number;
    consumedMaterialType: FletchingMaterialType;
    remainingProvidedMaterials: FletchingMaterialType[];
    craftedEpochMs: number;
}

export const FLETCHING_CATALOG: Record<FletchingTableType, FletchingTableData> = {
    YEW_FLETCHING_TABLE: { tableType: "YEW_FLETCHING_TABLE", maxDurability: 75, fletchingPower: 25, baseSuccessRatePercent: 85, capacityBonusPercent: 10 },
    RUNIC_MITHRIL_LEATHER_STITCHER: { tableType: "RUNIC_MITHRIL_LEATHER_STITCHER", maxDurability: 170, fletchingPower: 65, baseSuccessRatePercent: 92, capacityBonusPercent: 20 },
    CELESTIAL_VOID_FLETCHER_SANCTUM: { tableType: "CELESTIAL_VOID_FLETCHER_SANCTUM", maxDurability: 310, fletchingPower: 120, baseSuccessRatePercent: 99, capacityBonusPercent: 35 },
};

export const QUIVER_RECIPE_CATALOG: Record<QuiverPouchRecipeType, QuiverPouchRecipeData> = {
    WINDRUNNER_RANGER_QUIVER: { recipeType: "WINDRUNNER_RANGER_QUIVER", requiredMaterialType: "SUPPLE_STALKER_LEATHER", requiredMaterialCount: 2, baseArrowCapacity: 60, baseReloadSpeedHastePercent: 8 },
    PHOENIXFIRE_CROSSBOW_POUCH: { recipeType: "PHOENIXFIRE_CROSSBOW_POUCH", requiredMaterialType: "PHOENIX_FEATHER_CREST", requiredMaterialCount: 2, baseArrowCapacity: 150, baseReloadSpeedHastePercent: 18 },
    CELESTIAL_VOIDFANG_ENDLESS_QUIVER: { recipeType: "CELESTIAL_VOIDFANG_ENDLESS_QUIVER", requiredMaterialType: "CELESTIAL_VOID_RAPTOR_PLUME", requiredMaterialCount: 2, baseArrowCapacity: 360, baseReloadSpeedHastePercent: 40 },
};

export class AncientRunicLeatherFletchingQuiverEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(FLETCHING_CATALOG).map(f => f.fletchingPower), 1),
        maxBonus: Math.max(...Object.values(FLETCHING_CATALOG).map(f => f.capacityBonusPercent), 1),
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
     * Constructs and initializes a fletching table or leather stitcher.
     */
    public static constructTable(
        fletcherPlayerId: string,
        tableType: FletchingTableType
    ): ActiveFletchingTable {
        const data = FLETCHING_CATALOG[tableType];
        if (!data) {
            throw new Error(`Unsupported fletching table type: ${String(tableType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            tableId: `fletcher_${tableType.toLowerCase()}_${uuid}`,
            fletcherPlayerId,
            tableType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            fletchingPower: data.fletchingPower,
            isFunctional: true,
        };
    }

    /**
     * Stitches leather and feathers into ranger quivers, crossbow pouches, and endless quivers.
     * Note: Mutates the passed `table` in place and returns it as `updatedTable` for caller ergonomics.
     */
    public static craftQuiver(
        table: ActiveFletchingTable,
        recipeType: QuiverPouchRecipeType,
        providedMaterials: FletchingMaterialType[],
        craftRoll = Math.random(),
        craftsmanshipRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; quiver?: CraftedQuiverPouch; updatedTable?: ActiveFletchingTable; remainingDurability: number; remainingProvidedMaterials?: FletchingMaterialType[]; reason?: string } {
        if (!table || !table.isFunctional || table.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedTable: table,
                remainingDurability: table?.currentDurability ?? 0,
                reason: `Fletching table is loose or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const tableData = FLETCHING_CATALOG[table.tableType];
        if (!tableData) {
            return { success: false, updatedTable: table, remainingDurability: table.currentDurability, reason: `Unknown table model: ${String(table.tableType)}` };
        }

        const recipe = QUIVER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedTable: table, remainingDurability: table.currentDurability, reason: `Unknown quiver recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedMaterials)) {
            return { success: false, updatedTable: table, remainingDurability: table.currentDurability, reason: "Invalid materials array." };
        }

        // Count matching materials
        const matchingCount = providedMaterials.filter(m => m === recipe.requiredMaterialType).length;
        if (matchingCount < recipe.requiredMaterialCount) {
            return {
                success: false,
                updatedTable: table,
                remainingDurability: table.currentDurability,
                reason: `Insufficient materials: requires ${recipe.requiredMaterialCount}x ${recipe.requiredMaterialType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        table.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (table.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            table.currentDurability = Math.max(0, table.currentDurability);
            table.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedMaterials];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredMaterialCount; i--) {
            if (remaining[i] === recipe.requiredMaterialType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > tableData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedTable: table,
                remainingDurability: table.currentDurability,
                remainingProvidedMaterials: remaining,
                reason: `Fletching seam frayed: sinew cord snapped during quiver mouth binding, rolled ${rollPercent.toFixed(1)}, needed <= ${tableData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent craftsmanship score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeCraftsmanshipRoll = Number.isFinite(craftsmanshipRoll) ? Math.max(0, Math.min(1, craftsmanshipRoll)) : Math.random();
        const powerRatio = Math.min(1.0, table.fletchingPower / maxPower);
        const bonusPoints = (tableData.capacityBonusPercent / maxBonus) * 20;
        const craftsmanshipScore = Math.max(0, Math.min(100, Math.round(
            (safeCraftsmanshipRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((craftsmanshipScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCapacity = Math.round(recipe.baseArrowCapacity * qualityMultiplier);
        const finalHaste = Math.round(recipe.baseReloadSpeedHastePercent * qualityMultiplier);

        const uuid = this.generateSecureId();

        const quiver: CraftedQuiverPouch = {
            quiverId: `quiver_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalArrowCapacity: finalCapacity,
            finalReloadSpeedHastePercent: finalHaste,
            craftsmanshipPercent: craftsmanshipScore,
            consumedMaterialCount: recipe.requiredMaterialCount,
            consumedMaterialType: recipe.requiredMaterialType,
            remainingProvidedMaterials: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            quiver,
            updatedTable: table,
            remainingDurability: table.currentDurability,
            remainingProvidedMaterials: remaining,
        };
    }

    /**
     * Cleans sinew clamp and maintains fletching table.
     */
    public static maintainTable(
        table: ActiveFletchingTable,
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