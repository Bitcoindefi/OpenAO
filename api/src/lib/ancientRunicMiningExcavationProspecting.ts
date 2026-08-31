import crypto from "node:crypto";

/**
 * Ancient Runic Mining Excavation, Geological Prospecting & Vein Extraction Engine for OpenAO MMORPG.
 * Simulates mining tools (Novice Bronze Pickaxe, Runic Mithril Mining Drill, Celestial Void Core Sledge),
 * mineral ore veins (Granite Copper Deposit, Astral Mithril Seam, Void Adamantite Lode),
 * extracted raw gems & ores (Raw Malachite, Astral Mithril Chunk, Void Adamantite Core),
 * independent prospecting depth ratings (0% to 100%), ore yield and gem bonus scaling,
 * dynamic catalog maximum scaling, and pickaxe sharpening maintenance.
 */

export type MiningToolType = "NOVICE_BRONZE_PICKAXE" | "RUNIC_MITHRIL_MINING_DRILL" | "CELESTIAL_VOID_CORE_SLEDGE";
export type MineralVeinType = "GRANITE_COPPER_DEPOSIT" | "ASTRAL_MITHRIL_SEAM" | "VOID_ADAMANTITE_LODE";
export type ExtractedOreType = "RAW_MALACHITE" | "ASTRAL_MITHRIL_CHUNK" | "VOID_ADAMANTITE_CORE";

export interface MiningToolData {
    toolType: MiningToolType;
    maxDurability: number;
    miningPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    yieldBonusPercent: number;
}

export interface MineralVeinData {
    veinType: MineralVeinType;
    veinHardness: number;
    minMiningPowerRequired: number;
    yieldOreType: ExtractedOreType;
    baseOreYield: number;
    baseRareGemChancePercent: number;
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

export interface ExcavationMiningResult {
    excavationId: string;
    veinType: MineralVeinType;
    extractedOreType: ExtractedOreType;
    finalOreYield: number;
    rareGemDiscovered: boolean;
    prospectingDepthPercent: number; // 0 to 100
    excavatedEpochMs: number;
}

export const TOOL_CATALOG: Record<MiningToolType, MiningToolData> = {
    NOVICE_BRONZE_PICKAXE: { toolType: "NOVICE_BRONZE_PICKAXE", maxDurability: 75, miningPower: 25, baseSuccessRatePercent: 85, yieldBonusPercent: 10 },
    RUNIC_MITHRIL_MINING_DRILL: { toolType: "RUNIC_MITHRIL_MINING_DRILL", maxDurability: 170, miningPower: 65, baseSuccessRatePercent: 92, yieldBonusPercent: 20 },
    CELESTIAL_VOID_CORE_SLEDGE: { toolType: "CELESTIAL_VOID_CORE_SLEDGE", maxDurability: 310, miningPower: 120, baseSuccessRatePercent: 99, yieldBonusPercent: 35 },
};

export const VEIN_CATALOG: Record<MineralVeinType, MineralVeinData> = {
    GRANITE_COPPER_DEPOSIT: { veinType: "GRANITE_COPPER_DEPOSIT", veinHardness: 20, minMiningPowerRequired: 20, yieldOreType: "RAW_MALACHITE", baseOreYield: 15, baseRareGemChancePercent: 10 },
    ASTRAL_MITHRIL_SEAM: { veinType: "ASTRAL_MITHRIL_SEAM", veinHardness: 55, minMiningPowerRequired: 50, yieldOreType: "ASTRAL_MITHRIL_CHUNK", baseOreYield: 35, baseRareGemChancePercent: 25 },
    VOID_ADAMANTITE_LODE: { veinType: "VOID_ADAMANTITE_LODE", veinHardness: 105, minMiningPowerRequired: 100, yieldOreType: "VOID_ADAMANTITE_CORE", baseOreYield: 80, baseRareGemChancePercent: 50 },
};

export class AncientRunicMiningExcavationProspectingEngine {
    public static readonly DURABILITY_COST_PER_EXCAVATION = 10;

    /**
     * Helper to compute maximum power and bonus dynamically from catalog.
     */
    public static getCatalogMaxima(): { maxPower: number; maxBonus: number } {
        const tools = Object.values(TOOL_CATALOG);
        const maxPower = Math.max(...tools.map(t => t.miningPower), 1);
        const maxBonus = Math.max(...tools.map(t => t.yieldBonusPercent), 1);
        return { maxPower, maxBonus };
    }

    /**
     * Constructs and initializes a mining pickaxe or drill.
     */
    public static forgeTool(
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
     * Excavates mineral ore veins and prospects rare underground geodes.
     */
    public static excavateVein(
        tool: ActiveMiningTool,
        veinType: MineralVeinType,
        excavateRoll = Math.random(),
        depthRoll = Math.random(),
        gemRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; result?: ExcavationMiningResult; remainingDurability: number; reason?: string } {
        if (!tool || !tool.isFunctional || tool.currentDurability < this.DURABILITY_COST_PER_EXCAVATION) {
            return {
                success: false,
                remainingDurability: tool?.currentDurability ?? 0,
                reason: `Mining tool is blunted or lacks durability (requires ${this.DURABILITY_COST_PER_EXCAVATION}).`,
            };
        }

        const toolData = TOOL_CATALOG[tool.toolType];
        if (!toolData) {
            return { success: false, remainingDurability: tool.currentDurability, reason: `Unknown tool model: ${String(tool.toolType)}` };
        }

        const vein = VEIN_CATALOG[veinType];
        if (!vein) {
            return { success: false, remainingDurability: tool.currentDurability, reason: `Unknown mineral vein: ${String(veinType)}` };
        }

        if (tool.miningPower < vein.minMiningPowerRequired) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Insufficient mining power: requires ${vein.minMiningPowerRequired}, tool has ${tool.miningPower}.`,
            };
        }

        // Deduct durability
        tool.currentDurability -= this.DURABILITY_COST_PER_EXCAVATION;
        if (tool.currentDurability < this.DURABILITY_COST_PER_EXCAVATION) {
            tool.currentDurability = Math.max(0, tool.currentDurability);
            tool.isFunctional = false;
        }

        const safeRoll = Number.isFinite(excavateRoll) ? Math.max(0, Math.min(1, excavateRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > toolData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Excavation collapsed: rock stratum fractured and buried vein, rolled ${rollPercent.toFixed(1)}, needed <= ${toolData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent prospecting depth score (0% to 100%) dynamically using catalog maxima
        const { maxPower, maxBonus } = this.getCatalogMaxima();
        const safeDepthRoll = Number.isFinite(depthRoll) ? Math.max(0, Math.min(1, depthRoll)) : Math.random();
        const powerRatio = Math.min(1.0, tool.miningPower / maxPower);
        const bonusPoints = (toolData.yieldBonusPercent / maxBonus) * 20;
        const depthScore = Math.max(0, Math.min(100, Math.round(
            (safeDepthRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const yieldMultiplier = 0.8 + ((depthScore / 100) * 0.4); // 0.8 to 1.2x

        const finalYield = Math.round(vein.baseOreYield * yieldMultiplier);

        const safeGemRoll = Number.isFinite(gemRoll) ? Math.max(0, Math.min(1, gemRoll)) : Math.random();
        const gemDiscovered = (safeGemRoll * 100) <= (vein.baseRareGemChancePercent * (1 + depthScore / 200));

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const excavation: ExcavationMiningResult = {
            excavationId: `excav_${veinType.toLowerCase()}_${uuid}`,
            veinType,
            extractedOreType: vein.yieldOreType,
            finalOreYield: finalYield,
            rareGemDiscovered: gemDiscovered,
            prospectingDepthPercent: depthScore,
            excavatedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            result: excavation,
            remainingDurability: tool.currentDurability,
        };
    }

    /**
     * Sharpens pickaxe head or recharges mining drill core.
     */
    public static sharpenTool(
        tool: ActiveMiningTool,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!tool) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        tool.currentDurability = Math.min(tool.maxDurability, tool.currentDurability + amt);
        tool.isFunctional = tool.currentDurability >= this.DURABILITY_COST_PER_EXCAVATION;

        return {
            success: true,
            newDurability: tool.currentDurability,
            isFunctional: tool.isFunctional,
        };
    }
}