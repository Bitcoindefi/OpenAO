import crypto from "node:crypto";

/**
 * Ancient Runic Woodcutting Timber Harvesting & Sawmill Lumber Milling Engine for OpenAO MMORPG.
 * Simulates woodcutting axes (Bronze Felling Axe, Runic Mithril Hatchet, Celestial Void Cleaver),
 * ancient timber trees (Ancient Pine, Ironwood Sentinel, Celestial Starwood Elder),
 * wood hardness requirements vs chopping power, critical chop rolls (2.0x yield and rare resin drops),
 * sawmill plank milling with per-timber integer ratios, and axe maintenance.
 */

export type WoodcuttingAxeType = "BRONZE_FELLING_AXE" | "RUNIC_MITHRIL_HATCHET" | "CELESTIAL_VOID_CLEAVER";
export type AncientTreeType = "ANCIENT_PINE_TREE" | "IRONWOOD_SENTINEL" | "CELESTIAL_STARWOOD_ELDER";
export type RareResinType = "AMBER_PINE_RESIN" | "IRON_SAP_CRYSTAL" | "ASTRAL_ETHER_SAP";

export interface WoodcuttingAxeData {
    axeType: WoodcuttingAxeType;
    maxDurability: number;
    choppingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    criticalChopChancePercent: number;
}

export interface AncientTreeData {
    treeType: AncientTreeType;
    woodHardness: number;
    baseLogYield: number;
    timberMaterialName: string;
    associatedResin: RareResinType;
    requiredLogsPerPlank: number;
}

export interface ActiveWoodcuttingAxe {
    axeId: string;
    lumberjackPlayerId: string;
    axeType: WoodcuttingAxeType;
    currentDurability: number;
    maxDurability: number;
    choppingPower: number;
    isFunctional: boolean;
}

export interface ActiveAncientTree {
    treeId: string;
    treeType: AncientTreeType;
    remainingLogCapacity: number;
    maxLogCapacity: number;
    isFelled: boolean;
}

export interface TimberHarvestResult {
    harvestId: string;
    timberMaterial: string;
    extractedLogCount: number;
    foundRareResin?: RareResinType;
    isCriticalChop: boolean;
    remainingTreeCapacity: number;
    isTreeFelled: boolean;
    remainingDurability: number;
}

export const AXE_CATALOG: Record<WoodcuttingAxeType, WoodcuttingAxeData> = {
    BRONZE_FELLING_AXE: { axeType: "BRONZE_FELLING_AXE", maxDurability: 80, choppingPower: 25, baseSuccessRatePercent: 75, criticalChopChancePercent: 5 },
    RUNIC_MITHRIL_HATCHET: { axeType: "RUNIC_MITHRIL_HATCHET", maxDurability: 180, choppingPower: 65, baseSuccessRatePercent: 88, criticalChopChancePercent: 15 },
    CELESTIAL_VOID_CLEAVER: { axeType: "CELESTIAL_VOID_CLEAVER", maxDurability: 320, choppingPower: 120, baseSuccessRatePercent: 98, criticalChopChancePercent: 30 },
};

export const TREE_CATALOG: Record<AncientTreeType, AncientTreeData> = {
    ANCIENT_PINE_TREE: { treeType: "ANCIENT_PINE_TREE", woodHardness: 20, baseLogYield: 4, timberMaterialName: "ANCIENT_PINE_LOG", associatedResin: "AMBER_PINE_RESIN", requiredLogsPerPlank: 2 },
    IRONWOOD_SENTINEL: { treeType: "IRONWOOD_SENTINEL", woodHardness: 50, baseLogYield: 8, timberMaterialName: "IRONWOOD_LOG", associatedResin: "IRON_SAP_CRYSTAL", requiredLogsPerPlank: 3 },
    CELESTIAL_STARWOOD_ELDER: { treeType: "CELESTIAL_STARWOOD_ELDER", woodHardness: 90, baseLogYield: 15, timberMaterialName: "STARWOOD_LOG", associatedResin: "ASTRAL_ETHER_SAP", requiredLogsPerPlank: 4 },
};

export class AncientRunicWoodcuttingTimberLumberEngine {
    public static readonly DURABILITY_COST_PER_CHOP = 8;

    /**
     * Constructs and initializes a woodcutting axe.
     */
    public static forgeAxe(
        lumberjackPlayerId: string,
        axeType: WoodcuttingAxeType,
        currentEpochMs = Date.now()
    ): ActiveWoodcuttingAxe {
        const data = AXE_CATALOG[axeType];
        if (!data) {
            throw new Error(`Unsupported axe type: ${String(axeType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            axeId: `axe_${axeType.toLowerCase()}_${uuid}`,
            lumberjackPlayerId,
            axeType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            choppingPower: data.choppingPower,
            isFunctional: true,
        };
    }

    /**
     * Discovers and spawns an ancient timber tree.
     */
    public static discoverTree(
        treeType: AncientTreeType,
        capacityOverride?: number,
        currentEpochMs = Date.now()
    ): ActiveAncientTree {
        const data = TREE_CATALOG[treeType];
        if (!data) {
            throw new Error(`Unsupported tree type: ${String(treeType)}`);
        }

        const capacity = Number.isFinite(capacityOverride) && (capacityOverride as number) > 0 ? capacityOverride! : (data.baseLogYield * 5);
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            treeId: `tree_${treeType.toLowerCase()}_${uuid}`,
            treeType,
            remainingLogCapacity: capacity,
            maxLogCapacity: capacity,
            isFelled: false,
        };
    }

    /**
     * Chops an ancient tree with critical strike detection and rare resin discovery.
     */
    public static chopTree(
        axe: ActiveWoodcuttingAxe,
        tree: ActiveAncientTree,
        chopRoll = Math.random(),
        critRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; result?: TimberHarvestResult; remainingDurability: number; reason?: string } {
        if (!axe || !axe.isFunctional || axe.currentDurability < this.DURABILITY_COST_PER_CHOP) {
            return { success: false, remainingDurability: axe?.currentDurability ?? 0, reason: "Axe is broken or lacks durability." };
        }

        if (!tree || tree.isFelled || tree.remainingLogCapacity <= 0) {
            return { success: false, remainingDurability: axe.currentDurability, reason: "Tree is completely felled." };
        }

        const axeData = AXE_CATALOG[axe.axeType];
        const treeData = TREE_CATALOG[tree.treeType];

        // Check wood hardness vs axe chopping power
        if (treeData.woodHardness > axe.choppingPower) {
            return {
                success: false,
                remainingDurability: axe.currentDurability,
                reason: `Axe deflected: wood hardness (${treeData.woodHardness}) exceeds axe chopping power (${axe.choppingPower}).`,
            };
        }

        // Deduct durability
        axe.currentDurability -= this.DURABILITY_COST_PER_CHOP;
        if (axe.currentDurability <= 0) {
            axe.currentDurability = Math.max(0, axe.currentDurability);
            axe.isFunctional = false;
        }

        const safeRoll = Number.isFinite(chopRoll) ? Math.max(0, Math.min(1, chopRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > axeData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: axe.currentDurability,
                reason: `Chop glanced off bark: rolled ${rollPercent.toFixed(1)}, needed <= ${axeData.baseSuccessRatePercent}.`,
            };
        }

        // Evaluate critical chop
        const isCrit = (critRoll * 100) <= axeData.criticalChopChancePercent;
        const yieldMultiplier = isCrit ? 2.0 : 1.0;

        let logsToExtract = Math.round(treeData.baseLogYield * yieldMultiplier);
        logsToExtract = Math.min(logsToExtract, tree.remainingLogCapacity);

        tree.remainingLogCapacity -= logsToExtract;
        if (tree.remainingLogCapacity <= 0) {
            tree.remainingLogCapacity = 0;
            tree.isFelled = true;
        }

        const foundResin = isCrit ? treeData.associatedResin : undefined;
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const harvestRes: TimberHarvestResult = {
            harvestId: `harvest_${uuid}`,
            timberMaterial: treeData.timberMaterialName,
            extractedLogCount: logsToExtract,
            foundRareResin: foundResin,
            isCriticalChop: isCrit,
            remainingTreeCapacity: tree.remainingLogCapacity,
            isTreeFelled: tree.isFelled,
            remainingDurability: axe.currentDurability,
        };

        return {
            success: true,
            result: harvestRes,
            remainingDurability: axe.currentDurability,
        };
    }

    /**
     * Mills raw timber logs into construction lumber planks at sawmill.
     */
    public static millLumber(
        logCount: number,
        treeType: AncientTreeType
    ): { success: boolean; lumberPlanksProduced: number; requiredLogsPerPlank: number; reason?: string } {
        if (!Number.isFinite(logCount) || !Number.isInteger(logCount) || logCount <= 0) {
            return { success: false, lumberPlanksProduced: 0, requiredLogsPerPlank: 0, reason: "Invalid integer log quantity." };
        }

        const treeData = TREE_CATALOG[treeType];
        if (!treeData) {
            return { success: false, lumberPlanksProduced: 0, requiredLogsPerPlank: 0, reason: `Unknown timber type: ${String(treeType)}` };
        }

        const ratio = treeData.requiredLogsPerPlank;
        const planks = Math.floor(logCount / ratio);

        return {
            success: planks > 0,
            lumberPlanksProduced: planks,
            requiredLogsPerPlank: ratio,
            reason: planks === 0 ? `Requires at least ${ratio} logs to mill 1 plank of ${treeData.timberMaterialName}.` : undefined,
        };
    }

    /**
     * Sharpens and hones woodcutting axe.
     */
    public static sharpenAxe(
        axe: ActiveWoodcuttingAxe,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!axe) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        axe.currentDurability = Math.min(axe.maxDurability, axe.currentDurability + amt);
        axe.isFunctional = axe.currentDurability > 0;

        return {
            success: true,
            newDurability: axe.currentDurability,
            isFunctional: axe.isFunctional,
        };
    }
}