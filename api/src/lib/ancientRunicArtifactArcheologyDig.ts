import crypto from "node:crypto";

/**
 * Ancient Runic Artifact Archeology Dig, Fossil Excavation & Relic Restoration Engine for OpenAO MMORPG.
 * Simulates archeology survey tools (Bristle Brush, Bronze Trowel, Runic Sonic Sifter),
 * historical dig sites (Sandstone Ruins, Sunken Catacombs, Astral Necropolis),
 * excavation difficulty penalties, artifact fragment purity evaluations (0% to 100%), museum donation gold rewards, and tool wear.
 */

export type ArcheologyToolType = "BRISTLE_SURVEY_BRUSH" | "BRONZE_EXCAVATION_TROWEL" | "RUNIC_SONIC_SIFTER";
export type DigSiteType = "SANDSTONE_RUINS_DIG" | "SUNKEN_CATACOMBS_DIG" | "ASTRAL_NECROPOLIS_DIG";
export type RestoredRelicType = "CLAY_TABLET_FRAGMENT" | "GOLDEN_SCARAB_AMULET" | "STAR_CORE_PHYLACTERY";

export interface ArcheologyToolData {
    toolType: ArcheologyToolType;
    maxDurability: number;
    delicatePurityBonusPercent: number;
    rareDiscoveryBonusPercent: number;
}

export interface DigSiteData {
    siteType: DigSiteType;
    excavationDifficulty: number;
    relicType: RestoredRelicType;
    baseGoldValue: number;
}

export interface ActiveArcheologyTool {
    toolId: string;
    archeologistPlayerId: string;
    toolType: ArcheologyToolType;
    currentDurability: number;
    maxDurability: number;
    isBroken: boolean;
}

export interface ActiveDigSite {
    siteId: string;
    siteType: DigSiteType;
    location: { x: number; y: number };
    remainingExcavationLayers: number;
    isFullyExcavated: boolean;
}

export interface ExcavatedRelicResult {
    relicId: string;
    relicType: RestoredRelicType;
    purityRatingPercent: number; // 0 to 100
    museumGoldReward: number;
    discoveredEpochMs: number;
}

export const TOOL_CATALOG: Record<ArcheologyToolType, ArcheologyToolData> = {
    BRISTLE_SURVEY_BRUSH: { toolType: "BRISTLE_SURVEY_BRUSH", maxDurability: 80, delicatePurityBonusPercent: 40, rareDiscoveryBonusPercent: 10 },
    BRONZE_EXCAVATION_TROWEL: { toolType: "BRONZE_EXCAVATION_TROWEL", maxDurability: 140, delicatePurityBonusPercent: 20, rareDiscoveryBonusPercent: 25 },
    RUNIC_SONIC_SIFTER: { toolType: "RUNIC_SONIC_SIFTER", maxDurability: 220, delicatePurityBonusPercent: 80, rareDiscoveryBonusPercent: 50 },
};

export const DIG_SITE_CATALOG: Record<DigSiteType, DigSiteData> = {
    SANDSTONE_RUINS_DIG: { siteType: "SANDSTONE_RUINS_DIG", excavationDifficulty: 30, relicType: "CLAY_TABLET_FRAGMENT", baseGoldValue: 80 },
    SUNKEN_CATACOMBS_DIG: { siteType: "SUNKEN_CATACOMBS_DIG", excavationDifficulty: 60, relicType: "GOLDEN_SCARAB_AMULET", baseGoldValue: 200 },
    ASTRAL_NECROPOLIS_DIG: { siteType: "ASTRAL_NECROPOLIS_DIG", excavationDifficulty: 90, relicType: "STAR_CORE_PHYLACTERY", baseGoldValue: 500 },
};

export class AncientRunicArtifactArcheologyDigEngine {
    public static readonly TOOL_DURABILITY_LOSS_PER_DIG = 10;

    /**
     * Equips and initializes a survey tool.
     */
    public static forgeSurveyTool(
        archeologistPlayerId: string,
        toolType: ArcheologyToolType,
        currentEpochMs = Date.now()
    ): ActiveArcheologyTool {
        const data = TOOL_CATALOG[toolType];
        if (!data) {
            throw new Error(`Unsupported archeology tool type: ${String(toolType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            toolId: `tool_${toolType.toLowerCase()}_${uuid}`,
            archeologistPlayerId,
            toolType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isBroken: false,
        };
    }

    /**
     * Excavates an archeological layer from a dig site.
     */
    public static excavateSiteLayer(
        tool: ActiveArcheologyTool,
        site: ActiveDigSite,
        purityRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; relic?: ExcavatedRelicResult; remainingDurability: number; remainingLayers: number; reason?: string } {
        if (!tool || tool.isBroken || tool.currentDurability < this.TOOL_DURABILITY_LOSS_PER_DIG) {
            return { success: false, remainingDurability: tool?.currentDurability ?? 0, remainingLayers: site?.remainingExcavationLayers ?? 0, reason: "Tool is broken or lacks durability." };
        }

        if (!site || site.isFullyExcavated || site.remainingExcavationLayers <= 0) {
            return { success: false, remainingDurability: tool.currentDurability, remainingLayers: 0, reason: "Dig site is fully excavated or invalid." };
        }

        const toolData = TOOL_CATALOG[tool.toolType];
        const siteData = DIG_SITE_CATALOG[site.siteType];

        // Deduct durability
        tool.currentDurability -= this.TOOL_DURABILITY_LOSS_PER_DIG;
        if (tool.currentDurability === 0) {
            tool.isBroken = true;
        }

        site.remainingExcavationLayers -= 1;
        if (site.remainingExcavationLayers === 0) {
            site.isFullyExcavated = true;
        }

        // Calculate purity factored by site excavation difficulty
        const baseRoll = Number.isFinite(purityRoll) ? Math.max(0, Math.min(1, purityRoll)) : Math.random();
        const difficultyPenalty = Math.round(siteData.excavationDifficulty * 0.25);
        const rawPurity = Math.round((baseRoll * 60) + toolData.delicatePurityBonusPercent - difficultyPenalty);
        const purityScore = Math.max(5, Math.min(100, rawPurity));

        const rewardMultiplier = 0.5 + (purityScore / 100) + (toolData.rareDiscoveryBonusPercent / 100);
        const goldReward = Math.round(siteData.baseGoldValue * rewardMultiplier);

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const relic: ExcavatedRelicResult = {
            relicId: `relic_${siteData.relicType.toLowerCase()}_${uuid}`,
            relicType: siteData.relicType,
            purityRatingPercent: purityScore,
            museumGoldReward: goldReward,
            discoveredEpochMs: currentEpochMs,
        };

        return {
            success: true,
            relic,
            remainingDurability: tool.currentDurability,
            remainingLayers: site.remainingExcavationLayers,
        };
    }

    /**
     * Restores survey tool durability using field maintenance kits.
     */
    public static restoreToolDurability(
        tool: ActiveArcheologyTool,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isBroken: boolean } {
        if (!tool || tool.isBroken) return { success: false, newDurability: tool?.currentDurability ?? 0, isBroken: true };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        tool.currentDurability = Math.min(tool.maxDurability, tool.currentDurability + amt);

        return {
            success: true,
            newDurability: tool.currentDurability,
            isBroken: false,
        };
    }
}