import crypto from "node:crypto";

/**
 * Ancient Runic Mining Deep Underground Excavation, Pickaxe Mastery & Gem Ore Smelting Engine for OpenAO MMORPG.
 * Simulates mining tools (Copper Pickaxe, Runic Mithril Pickaxe, Celestial Void Drill),
 * subterranean ore veins (Vein of Pyrite, Astral Mithril Seam, Abyssal Darkstone Monolith),
 * hardness requirements vs mining power, critical vein strike rolls (2.0x yield), raw gem prospecting,
 * ore smelting into bars with per-ore ratios, and pickaxe sharpening.
 */

export type MiningToolType = "COPPER_PICKAXE" | "RUNIC_MITHRIL_PICKAXE" | "CELESTIAL_VOID_DRILL";
export type SubterraneanVeinType = "VEIN_OF_PYRITE" | "ASTRAL_MITHRIL_SEAM" | "ABYSSAL_DARKSTONE_MONOLITH";
export type RareGemType = "RAW_AMBER" | "ASTRAL_SAPPHIRE" | "VOID_DIAMOND";

export interface MiningToolData {
    toolType: MiningToolType;
    maxDurability: number;
    miningPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    criticalStrikeChancePercent: number;
}

export interface SubterraneanVeinData {
    veinType: SubterraneanVeinType;
    geologicalHardness: number;
    baseOreYield: number;
    oreMaterialName: string;
    associatedGem: RareGemType;
    requiredOresPerBar: number;
}

export interface ActiveMiningTool {
    toolId: string;
    minerPlayerId: string;
    toolType: MiningToolType;
    currentDurability: number;
    maxDurability: number;
    miningPower: number;
    isFunctional: boolean;
}

export interface ActiveSubterraneanVein {
    veinId: string;
    veinType: SubterraneanVeinType;
    remainingOreCapacity: number;
    maxOreCapacity: number;
    isDepleted: boolean;
}

export interface ExcavationStrikeResult {
    strikeId: string;
    oreMaterial: string;
    extractedOreCount: number;
    foundRareGem?: RareGemType;
    isCriticalStrike: boolean;
    remainingVeinCapacity: number;
    isVeinDepleted: boolean;
    remainingDurability: number;
}

export const TOOL_CATALOG: Record<MiningToolType, MiningToolData> = {
    COPPER_PICKAXE: { toolType: "COPPER_PICKAXE", maxDurability: 80, miningPower: 25, baseSuccessRatePercent: 75, criticalStrikeChancePercent: 5 },
    RUNIC_MITHRIL_PICKAXE: { toolType: "RUNIC_MITHRIL_PICKAXE", maxDurability: 180, miningPower: 65, baseSuccessRatePercent: 88, criticalStrikeChancePercent: 15 },
    CELESTIAL_VOID_DRILL: { toolType: "CELESTIAL_VOID_DRILL", maxDurability: 320, miningPower: 120, baseSuccessRatePercent: 98, criticalStrikeChancePercent: 30 },
};

export const VEIN_CATALOG: Record<SubterraneanVeinType, SubterraneanVeinData> = {
    VEIN_OF_PYRITE: { veinType: "VEIN_OF_PYRITE", geologicalHardness: 20, baseOreYield: 3, oreMaterialName: "PYRITE_ORE", associatedGem: "RAW_AMBER", requiredOresPerBar: 2 },
    ASTRAL_MITHRIL_SEAM: { veinType: "ASTRAL_MITHRIL_SEAM", geologicalHardness: 50, baseOreYield: 6, oreMaterialName: "ASTRAL_MITHRIL_ORE", associatedGem: "ASTRAL_SAPPHIRE", requiredOresPerBar: 3 },
    ABYSSAL_DARKSTONE_MONOLITH: { veinType: "ABYSSAL_DARKSTONE_MONOLITH", geologicalHardness: 90, baseOreYield: 12, oreMaterialName: "DARKSTONE_ORE", associatedGem: "VOID_DIAMOND", requiredOresPerBar: 4 },
};

export class AncientRunicMiningExcavationEngine {
    public static readonly DURABILITY_COST_PER_SWING = 8;

    /**
     * Constructs and initializes a mining pickaxe or drill.
     */
    public static forgeMiningTool(
        minerPlayerId: string,
        toolType: MiningToolType,
        currentEpochMs = Date.now()
    ): ActiveMiningTool {
        const data = TOOL_CATALOG[toolType];
        if (!data) {
            throw new Error(`Unsupported mining tool type: ${String(toolType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            toolId: `tool_${toolType.toLowerCase()}_${uuid}`,
            minerPlayerId,
            toolType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            miningPower: data.miningPower,
            isFunctional: true,
        };
    }

    /**
     * Discovers and spawns a subterranean ore vein.
     */
    public static discoverOreVein(
        veinType: SubterraneanVeinType,
        capacityOverride?: number,
        currentEpochMs = Date.now()
    ): ActiveSubterraneanVein {
        const data = VEIN_CATALOG[veinType];
        if (!data) {
            throw new Error(`Unsupported vein type: ${String(veinType)}`);
        }

        const capacity = Number.isFinite(capacityOverride) && (capacityOverride as number) > 0 ? capacityOverride! : (data.baseOreYield * 5);
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            veinId: `vein_${veinType.toLowerCase()}_${uuid}`,
            veinType,
            remainingOreCapacity: capacity,
            maxOreCapacity: capacity,
            isDepleted: false,
        };
    }

    /**
     * Mines and excavates an ore vein with critical strikes and gem prospecting.
     */
    public static mineVein(
        tool: ActiveMiningTool,
        vein: ActiveSubterraneanVein,
        strikeRoll = Math.random(),
        critRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; result?: ExcavationStrikeResult; remainingDurability?: number; reason?: string } {
        if (!tool || !tool.isFunctional || tool.currentDurability < this.DURABILITY_COST_PER_SWING) {
            return { success: false, remainingDurability: tool?.currentDurability ?? 0, reason: "Mining tool is broken or lacks durability." };
        }

        if (!vein || vein.isDepleted || vein.remainingOreCapacity <= 0) {
            return { success: false, remainingDurability: tool.currentDurability, reason: "Ore vein is completely depleted." };
        }

        const toolData = TOOL_CATALOG[tool.toolType];
        const veinData = VEIN_CATALOG[vein.veinType];

        // Check geological hardness vs mining power
        if (veinData.geologicalHardness > tool.miningPower) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Pickaxe deflected: geological hardness (${veinData.geologicalHardness}) exceeds tool mining power (${tool.miningPower}).`,
            };
        }

        // Deduct durability
        tool.currentDurability -= this.DURABILITY_COST_PER_SWING;
        if (tool.currentDurability <= 0) {
            tool.currentDurability = Math.max(0, tool.currentDurability);
            tool.isFunctional = false;
        }

        const rollPercent = (Number.isFinite(strikeRoll) ? Math.max(0, Math.min(1, strikeRoll)) : Math.random()) * 100;
        if (rollPercent > toolData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Swing glanced off stone: rolled ${rollPercent.toFixed(1)}, needed <= ${toolData.baseSuccessRatePercent}.`,
            };
        }

        // Evaluate critical vein strike
        const isCrit = (critRoll * 100) <= toolData.criticalStrikeChancePercent;
        const yieldMultiplier = isCrit ? 2.0 : 1.0;

        let oreToExtract = Math.round(veinData.baseOreYield * yieldMultiplier);
        oreToExtract = Math.min(oreToExtract, vein.remainingOreCapacity);

        vein.remainingOreCapacity -= oreToExtract;
        if (vein.remainingOreCapacity <= 0) {
            vein.remainingOreCapacity = 0;
            vein.isDepleted = true;
        }

        const foundGem = isCrit ? veinData.associatedGem : undefined;
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const strikeRes: ExcavationStrikeResult = {
            strikeId: `strike_${uuid}`,
            oreMaterial: veinData.oreMaterialName,
            extractedOreCount: oreToExtract,
            foundRareGem: foundGem,
            isCriticalStrike: isCrit,
            remainingVeinCapacity: vein.remainingOreCapacity,
            isVeinDepleted: vein.isDepleted,
            remainingDurability: tool.currentDurability,
        };

        return {
            success: true,
            result: strikeRes,
            remainingDurability: tool.currentDurability,
        };
    }

    /**
     * Smelts mined raw ore into refined metal bars according to vein-specific ratios.
     */
    public static smeltOre(
        oreCount: number,
        oreType: SubterraneanVeinType
    ): { success: boolean; refinedBarsProduced: number; requiredPerBar: number; reason?: string } {
        if (!Number.isFinite(oreCount) || oreCount <= 0) {
            return { success: false, refinedBarsProduced: 0, requiredPerBar: 0, reason: "Invalid ore quantity." };
        }

        const veinData = VEIN_CATALOG[oreType];
        if (!veinData) {
            return { success: false, refinedBarsProduced: 0, requiredPerBar: 0, reason: `Unknown ore type: ${String(oreType)}` };
        }

        const ratio = veinData.requiredOresPerBar;
        const bars = Math.floor(oreCount / ratio);
        return {
            success: bars > 0,
            refinedBarsProduced: bars,
            requiredPerBar: ratio,
            reason: bars === 0 ? `Requires at least ${ratio} raw ores to smelt 1 bar of ${veinData.oreMaterialName}.` : undefined,
        };
    }

    /**
     * Sharpens and repairs mining tool durability.
     */
    public static sharpenTool(
        tool: ActiveMiningTool,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!tool) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        tool.currentDurability = Math.min(tool.maxDurability, tool.currentDurability + amt);
        tool.isFunctional = tool.currentDurability > 0;

        return {
            success: true,
            newDurability: tool.currentDurability,
            isFunctional: tool.isFunctional,
        };
    }
}