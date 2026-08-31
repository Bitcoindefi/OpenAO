import crypto from "node:crypto";

/**
 * Ancient Runic Gargoyle Carving, Sentinel Statue & Bastion Ward Engine for OpenAO MMORPG.
 * Simulates sculptor banker tables and colossus stations (Hardened Granite Banker Table, Runic Mithril Sculptor Station, Celestial Void Colossus Anvil),
 * quarried stone blocks (Weathered Basalt Block, Arcane Marble Monolith, Celestial Voidstone Slab),
 * sentinel guardian statue recipes (Gargoyle Lookout Sentry, Archon Bastion Monument, Celestial Void Colossus Ward),
 * independent bastion resilience ratings (0% to 100%), defense armor and threat generation scaling,
 * upfront stone block deduction on all craft attempts, cached static catalog maxima, crypto-secure UUID fallback, and sculptor station maintenance.
 */

export type SculptorTableType = "HARDENED_GRANITE_BANKER_TABLE" | "RUNIC_MITHRIL_SCULPTOR_STATION" | "CELESTIAL_VOID_COLOSSUS_ANVIL";
export type QuarriedStoneBlockType = "WEATHERED_BASALT_BLOCK" | "ARCANE_MARBLE_MONOLITH" | "CELESTIAL_VOIDSTONE_SLAB";
export type SentinelStatueRecipeType = "GARGOYLE_LOOKOUT_SENTRY" | "ARCHON_BASTION_MONUMENT" | "CELESTIAL_VOID_COLOSSUS_WARD";

export interface SculptorTableData {
    tableType: SculptorTableType;
    maxDurability: number;
    sculptingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    bastionBonusPercent: number;
}

export interface SentinelStatueRecipeData {
    recipeType: SentinelStatueRecipeType;
    requiredBlockType: QuarriedStoneBlockType;
    requiredBlockCount: number;
    baseDefenseArmor: number;
    baseThreatGenerationPercent: number;
}

export interface ActiveSculptorTable {
    tableId: string;
    sculptorPlayerId: string;
    tableType: SculptorTableType;
    currentDurability: number;
    maxDurability: number;
    sculptingPower: number;
    isFunctional: boolean;
}

export interface CraftedSentinelStatue {
    statueId: string;
    recipeType: SentinelStatueRecipeType;
    finalDefenseArmor: number;
    finalThreatGenerationPercent: number;
    bastionResiliencePercent: number; // 0 to 100
    consumedBlockCount: number;
    consumedBlockType: QuarriedStoneBlockType;
    remainingProvidedBlocks: QuarriedStoneBlockType[];
    craftedEpochMs: number;
}

export const SCULPTOR_CATALOG: Record<SculptorTableType, SculptorTableData> = {
    HARDENED_GRANITE_BANKER_TABLE: { tableType: "HARDENED_GRANITE_BANKER_TABLE", maxDurability: 75, sculptingPower: 25, baseSuccessRatePercent: 85, bastionBonusPercent: 10 },
    RUNIC_MITHRIL_SCULPTOR_STATION: { tableType: "RUNIC_MITHRIL_SCULPTOR_STATION", maxDurability: 170, sculptingPower: 65, baseSuccessRatePercent: 92, bastionBonusPercent: 20 },
    CELESTIAL_VOID_COLOSSUS_ANVIL: { tableType: "CELESTIAL_VOID_COLOSSUS_ANVIL", maxDurability: 310, sculptingPower: 120, baseSuccessRatePercent: 99, bastionBonusPercent: 35 },
};

export const STATUE_RECIPE_CATALOG: Record<SentinelStatueRecipeType, SentinelStatueRecipeData> = {
    GARGOYLE_LOOKOUT_SENTRY: { recipeType: "GARGOYLE_LOOKOUT_SENTRY", requiredBlockType: "WEATHERED_BASALT_BLOCK", requiredBlockCount: 2, baseDefenseArmor: 50, baseThreatGenerationPercent: 10 },
    ARCHON_BASTION_MONUMENT: { recipeType: "ARCHON_BASTION_MONUMENT", requiredBlockType: "ARCANE_MARBLE_MONOLITH", requiredBlockCount: 2, baseDefenseArmor: 120, baseThreatGenerationPercent: 25 },
    CELESTIAL_VOID_COLOSSUS_WARD: { recipeType: "CELESTIAL_VOID_COLOSSUS_WARD", requiredBlockType: "CELESTIAL_VOIDSTONE_SLAB", requiredBlockCount: 2, baseDefenseArmor: 280, baseThreatGenerationPercent: 60 },
};

export class AncientRunicMasonryGargoyleStatueEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(SCULPTOR_CATALOG).map(s => s.sculptingPower), 1),
        maxBonus: Math.max(...Object.values(SCULPTOR_CATALOG).map(s => s.bastionBonusPercent), 1),
    };

    /**
     * Generates a crypto-secure UUID or collision-resistant hex string.
     */
    private static generateSecureId(currentEpochMs = Date.now()): string {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        if (typeof crypto.randomBytes === "function") {
            return crypto.randomBytes(16).toString("hex");
        }
        return `${currentEpochMs}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Constructs and initializes a sculptor banker table or colossus station.
     */
    public static constructTable(
        sculptorPlayerId: string,
        tableType: SculptorTableType,
        currentEpochMs = Date.now()
    ): ActiveSculptorTable {
        const data = SCULPTOR_CATALOG[tableType];
        if (!data) {
            throw new Error(`Unsupported sculptor table type: ${String(tableType)}`);
        }

        const uuid = this.generateSecureId(currentEpochMs);

        return {
            tableId: `sculptor_${tableType.toLowerCase()}_${uuid}`,
            sculptorPlayerId,
            tableType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            sculptingPower: data.sculptingPower,
            isFunctional: true,
        };
    }

    /**
     * Carves quarried stone blocks into sentinel gargoyles, archon monuments, and void colossus wards.
     * Note: Mutates the passed `table` in place and returns it as `updatedTable` for caller convenience.
     */
    public static craftStatue(
        table: ActiveSculptorTable,
        recipeType: SentinelStatueRecipeType,
        providedBlocks: QuarriedStoneBlockType[],
        craftRoll = Math.random(),
        resilienceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; statue?: CraftedSentinelStatue; updatedTable?: ActiveSculptorTable; remainingDurability: number; remainingProvidedBlocks?: QuarriedStoneBlockType[]; reason?: string } {
        if (!table || !table.isFunctional || table.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedTable: table,
                remainingDurability: table?.currentDurability ?? 0,
                reason: `Sculptor table is cracked or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const tableData = SCULPTOR_CATALOG[table.tableType];
        if (!tableData) {
            return { success: false, updatedTable: table, remainingDurability: table.currentDurability, reason: `Unknown table model: ${String(table.tableType)}` };
        }

        const recipe = STATUE_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedTable: table, remainingDurability: table.currentDurability, reason: `Unknown statue recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedBlocks)) {
            return { success: false, updatedTable: table, remainingDurability: table.currentDurability, reason: "Invalid stone blocks array." };
        }

        // Count matching blocks
        const matchingCount = providedBlocks.filter(b => b === recipe.requiredBlockType).length;
        if (matchingCount < recipe.requiredBlockCount) {
            return {
                success: false,
                updatedTable: table,
                remainingDurability: table.currentDurability,
                reason: `Insufficient stone blocks: requires ${recipe.requiredBlockCount}x ${recipe.requiredBlockType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        table.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (table.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            table.currentDurability = Math.max(0, table.currentDurability);
            table.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedBlocks];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredBlockCount; i--) {
            if (remaining[i] === recipe.requiredBlockType) {
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
                remainingProvidedBlocks: remaining,
                reason: `Masonry fractured: chisel struck fault line in stone core, rolled ${rollPercent.toFixed(1)}, needed <= ${tableData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent resilience score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeResilienceRoll = Number.isFinite(resilienceRoll) ? Math.max(0, Math.min(1, resilienceRoll)) : Math.random();
        const powerRatio = Math.min(1.0, table.sculptingPower / maxPower);
        const bonusPoints = (tableData.bastionBonusPercent / maxBonus) * 20;
        const resilienceScore = Math.max(0, Math.min(100, Math.round(
            (safeResilienceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((resilienceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalArmor = Math.round(recipe.baseDefenseArmor * qualityMultiplier);
        const finalThreat = Math.round(recipe.baseThreatGenerationPercent * qualityMultiplier);

        const uuid = this.generateSecureId(currentEpochMs);

        const statue: CraftedSentinelStatue = {
            statueId: `statue_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalDefenseArmor: finalArmor,
            finalThreatGenerationPercent: finalThreat,
            bastionResiliencePercent: resilienceScore,
            consumedBlockCount: recipe.requiredBlockCount,
            consumedBlockType: recipe.requiredBlockType,
            remainingProvidedBlocks: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            statue,
            updatedTable: table,
            remainingDurability: table.currentDurability,
            remainingProvidedBlocks: remaining,
        };
    }

    /**
     * Resurfaces banker surface and maintains sculptor table.
     */
    public static maintainTable(
        table: ActiveSculptorTable,
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