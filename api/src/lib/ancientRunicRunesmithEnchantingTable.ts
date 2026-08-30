import crypto from "node:crypto";

/**
 * Ancient Runic Runesmith Enchanting Table, Glyphic Imbuing & Prefix/Suffix Affix Synthesis Engine for OpenAO MMORPG.
 * Simulates enchanting tables (Obsidian Runesmith Anvil, Celestial Inscription Table, Void Genesis Altar),
 * primal runestone imbuing (Rune of Berserking, Rune of Warding, Rune of Haste), prefix and suffix affix assignment,
 * success rate probability rolls (85% to 99%), item rarity tier scaling (Common to Legendary), and catalyst durability consumption.
 */

export type EnchantingTableType = "OBSIDIAN_RUNESMITH_ANVIL" | "CELESTIAL_INSCRIPTION_TABLE" | "VOID_GENESIS_ALTAR";
export type PrimalRuneType = "RUNE_OF_BERSERKING" | "RUNE_OF_WARDING" | "RUNE_OF_HASTE";
export type AffixSlotType = "PREFIX" | "SUFFIX";
export type EquipmentQualityTier = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface EnchantingTableModelData {
    tableType: EnchantingTableType;
    maxCatalystDurability: number;
    baseSuccessRatePercent: number; // 0 to 100
}

export interface PrimalRuneData {
    runeType: PrimalRuneType;
    affixSlot: AffixSlotType;
    affixName: string;
    statBonusType: string;
    baseStatValue: number;
}

export interface ActiveEnchantingTable {
    tableId: string;
    runesmithPlayerId: string;
    tableType: EnchantingTableType;
    currentCatalystDurability: number;
    maxCatalystDurability: number;
    isFunctional: boolean;
}

export interface EnchantableEquipment {
    equipmentId: string;
    equipmentName: string;
    qualityTier: EquipmentQualityTier;
    prefixAffix?: string;
    suffixAffix?: string;
    bonusPhysicalDamage: number;
    bonusMagicResistance: number;
    bonusAttackSpeedPercent: number;
}

export const TABLE_CATALOG: Record<EnchantingTableType, EnchantingTableModelData> = {
    OBSIDIAN_RUNESMITH_ANVIL: { tableType: "OBSIDIAN_RUNESMITH_ANVIL", maxCatalystDurability: 100, baseSuccessRatePercent: 85 },
    CELESTIAL_INSCRIPTION_TABLE: { tableType: "CELESTIAL_INSCRIPTION_TABLE", maxCatalystDurability: 150, baseSuccessRatePercent: 92 },
    VOID_GENESIS_ALTAR: { tableType: "VOID_GENESIS_ALTAR", maxCatalystDurability: 250, baseSuccessRatePercent: 99 },
};

export const RUNE_CATALOG: Record<PrimalRuneType, PrimalRuneData> = {
    RUNE_OF_BERSERKING: { runeType: "RUNE_OF_BERSERKING", affixSlot: "PREFIX", affixName: "Berserker's", statBonusType: "PHYSICAL_DAMAGE", baseStatValue: 35 },
    RUNE_OF_WARDING: { runeType: "RUNE_OF_WARDING", affixSlot: "SUFFIX", affixName: "of the Aegis", statBonusType: "MAGIC_RESISTANCE", baseStatValue: 40 },
    RUNE_OF_HASTE: { runeType: "RUNE_OF_HASTE", affixSlot: "SUFFIX", affixName: "of the Zephyr", statBonusType: "ATTACK_SPEED_PERCENT", baseStatValue: 25 },
};

export const TIER_MULTIPLIERS: Record<EquipmentQualityTier, number> = {
    COMMON: 1.0,
    RARE: 1.25,
    EPIC: 1.5,
    LEGENDARY: 2.0,
};

export class AncientRunicRunesmithEnchantingTableEngine {
    public static readonly CATALYST_COST_PER_ENCHANT = 15;

    /**
     * Constructs and initializes an enchanting table.
     */
    public static constructTable(
        runesmithPlayerId: string,
        tableType: EnchantingTableType,
        currentEpochMs = Date.now()
    ): ActiveEnchantingTable {
        const data = TABLE_CATALOG[tableType];
        if (!data) {
            throw new Error(`Unsupported table type: ${String(tableType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            tableId: `table_${tableType.toLowerCase()}_${uuid}`,
            runesmithPlayerId,
            tableType,
            currentCatalystDurability: data.maxCatalystDurability,
            maxCatalystDurability: data.maxCatalystDurability,
            isFunctional: true,
        };
    }

    /**
     * Imbues a primal runestone into target equipment, rolling against the table success rate.
     */
    public static imbueRune(
        table: ActiveEnchantingTable,
        equipment: EnchantableEquipment,
        runeType: PrimalRuneType,
        rng: () => number = Math.random
    ): { success: boolean; appliedAffix?: string; finalBonusValue?: number; remainingCatalyst: number; reason?: string } {
        if (!table || !table.isFunctional || table.currentCatalystDurability < this.CATALYST_COST_PER_ENCHANT) {
            return {
                success: false,
                remainingCatalyst: table?.currentCatalystDurability ?? 0,
                reason: `Enchanting table is broken or lacks catalyst (requires ${this.CATALYST_COST_PER_ENCHANT}).`,
            };
        }

        if (!equipment) {
            return { success: false, remainingCatalyst: table.currentCatalystDurability, reason: "Invalid equipment item." };
        }

        const runeData = RUNE_CATALOG[runeType];
        if (!runeData) {
            return { success: false, remainingCatalyst: table.currentCatalystDurability, reason: `Unknown rune type: ${String(runeType)}` };
        }

        // Slot occupancy check
        if (runeData.affixSlot === "PREFIX" && equipment.prefixAffix) {
            return { success: false, remainingCatalyst: table.currentCatalystDurability, reason: `Equipment already has prefix affix: ${equipment.prefixAffix}` };
        }
        if (runeData.affixSlot === "SUFFIX" && equipment.suffixAffix) {
            return { success: false, remainingCatalyst: table.currentCatalystDurability, reason: `Equipment already has suffix affix: ${equipment.suffixAffix}` };
        }

        // Deduct catalyst durability
        table.currentCatalystDurability -= this.CATALYST_COST_PER_ENCHANT;
        if (table.currentCatalystDurability === 0) {
            table.isFunctional = false;
        }

        // Success rate roll
        const tableData = TABLE_CATALOG[table.tableType];
        const roll = rng() * 100;
        if (roll > tableData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingCatalyst: table.currentCatalystDurability,
                reason: `Imbuing failed: rolled ${roll.toFixed(1)}, needed <= ${tableData.baseSuccessRatePercent}. Catalyst consumed.`,
            };
        }

        // Calculate scaled bonus
        const tierMultiplier = TIER_MULTIPLIERS[equipment.qualityTier] || 1.0;
        const finalBonus = Math.round(runeData.baseStatValue * tierMultiplier);

        if (runeData.affixSlot === "PREFIX") {
            equipment.prefixAffix = runeData.affixName;
        } else {
            equipment.suffixAffix = runeData.affixName;
        }

        if (runeData.statBonusType === "PHYSICAL_DAMAGE") {
            equipment.bonusPhysicalDamage = (equipment.bonusPhysicalDamage || 0) + finalBonus;
        } else if (runeData.statBonusType === "MAGIC_RESISTANCE") {
            equipment.bonusMagicResistance = (equipment.bonusMagicResistance || 0) + finalBonus;
        } else if (runeData.statBonusType === "ATTACK_SPEED_PERCENT") {
            equipment.bonusAttackSpeedPercent = (equipment.bonusAttackSpeedPercent || 0) + finalBonus;
        }

        return {
            success: true,
            appliedAffix: runeData.affixName,
            finalBonusValue: finalBonus,
            remainingCatalyst: table.currentCatalystDurability,
        };
    }

    /**
     * Refuels table catalyst durability.
     */
    public static refuelCatalyst(
        table: ActiveEnchantingTable,
        fuelAmount = 50
    ): { success: boolean; newDurability: number } {
        if (!table) return { success: false, newDurability: 0 };

        const amt = Number.isFinite(fuelAmount) ? Math.max(0, fuelAmount) : 50;
        table.currentCatalystDurability = Math.min(table.maxCatalystDurability, table.currentCatalystDurability + amt);
        table.isFunctional = table.currentCatalystDurability > 0;

        return {
            success: true,
            newDurability: table.currentCatalystDurability,
        };
    }
}