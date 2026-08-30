import crypto from "node:crypto";

/**
 * Ancient Runic Jewelcrafting Gem Setting, Prismatic Faceting & Socket Synthesis Engine for OpenAO MMORPG.
 * Simulates jewelcrafting workbenches (Obsidian Workbench, Celestial Bench, Prismatic Astral Font),
 * cut gemstones (Ruby of Carnage, Sapphire of Intellect, Emerald of Vitality, Diamond of Invulnerability),
 * socket types (RED, BLUE, GREEN, PRISMATIC), socket color matching resonance (+20% to +55%), and chisel unsocketing.
 */

export type JewelcraftingWorkbenchType = "OBSIDIAN_FACETING_WORKBENCH" | "CELESTIAL_LAPIDARY_BENCH" | "PRISMATIC_ASTRAL_FONT";
export type SocketColorType = "RED" | "BLUE" | "GREEN" | "PRISMATIC";
export type CutGemstoneType = "RUBY_OF_CARNAGE" | "SAPPHIRE_OF_INTELLECT" | "EMERALD_OF_VITALITY" | "DIAMOND_OF_INVULNERABILITY";

export interface JewelcraftingWorkbenchData {
    workbenchType: JewelcraftingWorkbenchType;
    maxDurability: number;
    baseSuccessRatePercent: number; // 0 to 100
    resonanceQualityBonusPercent: number;
}

export interface CutGemstoneData {
    gemType: CutGemstoneType;
    socketColor: SocketColorType;
    statType: "PHYSICAL_DAMAGE" | "MAGIC_POWER" | "MAX_HEALTH" | "ALL_RESISTANCES";
    baseBonusValue: number;
}

export interface EquipmentSocketSlot {
    slotId: string;
    socketColor: SocketColorType;
    socketedGem?: {
        gemType: CutGemstoneType;
        statType: string;
        appliedStatValue: number;
        hasResonanceMatchBonus: boolean;
    };
}

export interface SocketableEquipmentItem {
    itemId: string;
    itemName: string;
    sockets: EquipmentSocketSlot[];
}

export interface ActiveJewelcraftingWorkbench {
    workbenchId: string;
    jewelerPlayerId: string;
    workbenchType: JewelcraftingWorkbenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export const WORKBENCH_CATALOG: Record<JewelcraftingWorkbenchType, JewelcraftingWorkbenchData> = {
    OBSIDIAN_FACETING_WORKBENCH: { workbenchType: "OBSIDIAN_FACETING_WORKBENCH", maxDurability: 100, baseSuccessRatePercent: 85, resonanceQualityBonusPercent: 10 },
    CELESTIAL_LAPIDARY_BENCH: { workbenchType: "CELESTIAL_LAPIDARY_BENCH", maxDurability: 160, baseSuccessRatePercent: 92, resonanceQualityBonusPercent: 20 },
    PRISMATIC_ASTRAL_FONT: { workbenchType: "PRISMATIC_ASTRAL_FONT", maxDurability: 250, baseSuccessRatePercent: 99, resonanceQualityBonusPercent: 35 },
};

export const GEM_CATALOG: Record<CutGemstoneType, CutGemstoneData> = {
    RUBY_OF_CARNAGE: { gemType: "RUBY_OF_CARNAGE", socketColor: "RED", statType: "PHYSICAL_DAMAGE", baseBonusValue: 40 },
    SAPPHIRE_OF_INTELLECT: { gemType: "SAPPHIRE_OF_INTELLECT", socketColor: "BLUE", statType: "MAGIC_POWER", baseBonusValue: 50 },
    EMERALD_OF_VITALITY: { gemType: "EMERALD_OF_VITALITY", socketColor: "GREEN", statType: "MAX_HEALTH", baseBonusValue: 300 },
    DIAMOND_OF_INVULNERABILITY: { gemType: "DIAMOND_OF_INVULNERABILITY", socketColor: "PRISMATIC", statType: "ALL_RESISTANCES", baseBonusValue: 25 },
};

export class AncientRunicJewelcraftingGemSettingEngine {
    public static readonly DURABILITY_COST_PER_SETTING = 10;
    public static readonly BASE_RESONANCE_BONUS_PERCENT = 20;

    /**
     * Constructs and initializes a jewelcrafting workbench.
     */
    public static constructWorkbench(
        jewelerPlayerId: string,
        workbenchType: JewelcraftingWorkbenchType,
        currentEpochMs = Date.now()
    ): ActiveJewelcraftingWorkbench {
        const data = WORKBENCH_CATALOG[workbenchType];
        if (!data) {
            throw new Error(`Unsupported workbench type: ${String(workbenchType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            workbenchId: `wb_${workbenchType.toLowerCase()}_${uuid}`,
            jewelerPlayerId,
            workbenchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Sockets a cut gemstone into an equipment socket.
     */
    public static socketGemstone(
        workbench: ActiveJewelcraftingWorkbench,
        equipment: SocketableEquipmentItem,
        slotIndex: number,
        gemType: CutGemstoneType,
        rng: () => number = Math.random
    ): { success: boolean; socketedSlot?: EquipmentSocketSlot; isGemDestroyed?: boolean; remainingDurability: number; reason?: string } {
        if (!workbench || !workbench.isFunctional || workbench.currentDurability < this.DURABILITY_COST_PER_SETTING) {
            return {
                success: false,
                remainingDurability: workbench?.currentDurability ?? 0,
                reason: `Workbench is broken or lacks durability (requires ${this.DURABILITY_COST_PER_SETTING}).`,
            };
        }

        if (!equipment || !Array.isArray(equipment.sockets)) {
            return { success: false, remainingDurability: workbench.currentDurability, reason: "Invalid equipment item or sockets." };
        }

        const slot = equipment.sockets[slotIndex];
        if (!slot) {
            return { success: false, remainingDurability: workbench.currentDurability, reason: `Socket slot index ${slotIndex} not found.` };
        }

        if (slot.socketedGem) {
            return { success: false, remainingDurability: workbench.currentDurability, reason: `Socket slot ${slotIndex} is already occupied.` };
        }

        const gemData = GEM_CATALOG[gemType];
        if (!gemData) {
            return { success: false, remainingDurability: workbench.currentDurability, reason: `Unknown gemstone type: ${String(gemType)}` };
        }

        // Deduct durability robustly
        workbench.currentDurability -= this.DURABILITY_COST_PER_SETTING;
        if (workbench.currentDurability <= 0) {
            workbench.currentDurability = Math.max(0, workbench.currentDurability);
            workbench.isFunctional = false;
        }

        const wbData = WORKBENCH_CATALOG[workbench.workbenchType];
        const roll = rng() * 100;
        if (roll > wbData.baseSuccessRatePercent) {
            return {
                success: false,
                isGemDestroyed: true,
                remainingDurability: workbench.currentDurability,
                reason: `Gem setting shattered: rolled ${roll.toFixed(1)}, needed <= ${wbData.baseSuccessRatePercent}. Gem is consumed and durability was deducted.`,
            };
        }

        // Evaluate color matching resonance
        const isColorMatch = slot.socketColor === "PRISMATIC" || gemData.socketColor === "PRISMATIC" || slot.socketColor === gemData.socketColor;
        const resonanceBonusPercent = isColorMatch ? (this.BASE_RESONANCE_BONUS_PERCENT + wbData.resonanceQualityBonusPercent) : 0;
        const multiplier = 1 + (resonanceBonusPercent / 100);

        const appliedStat = Math.round(gemData.baseBonusValue * multiplier);

        slot.socketedGem = {
            gemType,
            statType: gemData.statType,
            appliedStatValue: appliedStat,
            hasResonanceMatchBonus: isColorMatch,
        };

        return {
            success: true,
            socketedSlot: slot,
            isGemDestroyed: false,
            remainingDurability: workbench.currentDurability,
        };
    }

    /**
     * Unsockets a gemstone using jeweler chisels.
     */
    public static unsocketGemstone(
        workbench: ActiveJewelcraftingWorkbench,
        equipment: SocketableEquipmentItem,
        slotIndex: number
    ): { success: boolean; extractedGemType?: CutGemstoneType; reason?: string } {
        if (!workbench || !workbench.isFunctional) {
            return { success: false, reason: "Workbench is non-functional or invalid." };
        }

        const slot = equipment?.sockets?.[slotIndex];
        if (!slot || !slot.socketedGem) {
            return { success: false, reason: "Socket slot is empty or invalid." };
        }

        const extracted = slot.socketedGem.gemType;
        slot.socketedGem = undefined;

        return {
            success: true,
            extractedGemType: extracted,
        };
    }
}