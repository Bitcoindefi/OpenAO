import crypto from "node:crypto";

/**
 * Ancient Runic Deep-Sea Fishing, Harpoon Mastery & Leviathan Catch Engine for OpenAO MMORPG.
 * Simulates oceanic fishing tackle (Reinforced Bone Harpoon, Runic Mithril Oceanic Rod, Celestial Void Leviathan Ballista),
 * oceanic depth zones (Coastal Reef Shallows, Abyssal Trench Rift, Celestial Astral Whirlpool),
 * ancient aquatic catches (Prismatic Reef Fin, Abyssal Kraken Tentacle, Celestial Leviathan Heart),
 * independent angling quality ratings (0% to 100%), catch yield and rare trophy scaling,
 * cached static catalog maxima, and tackle maintenance.
 */

export type HarpoonToolType = "REINFORCED_BONE_HARPOON" | "RUNIC_MITHRIL_OCEANIC_ROD" | "CELESTIAL_VOID_LEVIATHAN_BALLISTA";
export type OceanicDepthZoneType = "COASTAL_REEF_SHALLOWS" | "ABYSSAL_TRENCH_RIFT" | "CELESTIAL_ASTRAL_WHIRLPOOL";
export type AquaticCatchType = "PRISMATIC_REEF_FIN" | "ABYSSAL_KRAKEN_TENTACLE" | "CELESTIAL_LEVIATHAN_HEART";

export interface HarpoonToolData {
    toolType: HarpoonToolType;
    maxDurability: number;
    anglingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    catchBonusPercent: number;
}

export interface OceanicDepthZoneData {
    zoneType: OceanicDepthZoneType;
    waterResistance: number;
    minAnglingPowerRequired: number;
    yieldCatchType: AquaticCatchType;
    baseCatchYield: number;
    baseRareTrophyChancePercent: number;
}

export interface ActiveHarpoonTool {
    toolId: string;
    anglerPlayerId: string;
    toolType: HarpoonToolType;
    currentDurability: number;
    maxDurability: number;
    anglingPower: number;
    isFunctional: boolean;
}

export interface OceanicFishingResult {
    fishingId: string;
    zoneType: OceanicDepthZoneType;
    yieldCatchType: AquaticCatchType;
    finalCatchYield: number;
    rareTrophyCaught: boolean;
    anglingQualityPercent: number; // 0 to 100
    fishedEpochMs: number;
}

export const HARPOON_CATALOG: Record<HarpoonToolType, HarpoonToolData> = {
    REINFORCED_BONE_HARPOON: { toolType: "REINFORCED_BONE_HARPOON", maxDurability: 75, anglingPower: 25, baseSuccessRatePercent: 85, catchBonusPercent: 10 },
    RUNIC_MITHRIL_OCEANIC_ROD: { toolType: "RUNIC_MITHRIL_OCEANIC_ROD", maxDurability: 170, anglingPower: 65, baseSuccessRatePercent: 92, catchBonusPercent: 20 },
    CELESTIAL_VOID_LEVIATHAN_BALLISTA: { toolType: "CELESTIAL_VOID_LEVIATHAN_BALLISTA", maxDurability: 310, anglingPower: 120, baseSuccessRatePercent: 99, catchBonusPercent: 35 },
};

export const ZONE_CATALOG: Record<OceanicDepthZoneType, OceanicDepthZoneData> = {
    COASTAL_REEF_SHALLOWS: { zoneType: "COASTAL_REEF_SHALLOWS", waterResistance: 20, minAnglingPowerRequired: 20, yieldCatchType: "PRISMATIC_REEF_FIN", baseCatchYield: 15, baseRareTrophyChancePercent: 10 },
    ABYSSAL_TRENCH_RIFT: { zoneType: "ABYSSAL_TRENCH_RIFT", waterResistance: 55, minAnglingPowerRequired: 50, yieldCatchType: "ABYSSAL_KRAKEN_TENTACLE", baseCatchYield: 35, baseRareTrophyChancePercent: 25 },
    CELESTIAL_ASTRAL_WHIRLPOOL: { zoneType: "CELESTIAL_ASTRAL_WHIRLPOOL", waterResistance: 105, minAnglingPowerRequired: 100, yieldCatchType: "CELESTIAL_LEVIATHAN_HEART", baseCatchYield: 80, baseRareTrophyChancePercent: 50 },
};

export class AncientRunicFishingOceanicHarpoonEngine {
    public static readonly DURABILITY_COST_PER_CAST = 10;

    /**
     * Cached catalog maxima to optimize hot performance loops.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(HARPOON_CATALOG).map(t => t.anglingPower), 1),
        maxBonus: Math.max(...Object.values(HARPOON_CATALOG).map(t => t.catchBonusPercent), 1),
    };

    /**
     * Constructs and initializes an oceanic harpoon or rod.
     */
    public static forgeHarpoon(
        anglerPlayerId: string,
        toolType: HarpoonToolType,
        currentEpochMs = Date.now()
    ): ActiveHarpoonTool {
        const data = HARPOON_CATALOG[toolType];
        if (!data) {
            throw new Error(`Unsupported harpoon tool type: ${String(toolType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            toolId: `harpoon_${toolType.toLowerCase()}_${uuid}`,
            anglerPlayerId,
            toolType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            anglingPower: data.anglingPower,
            isFunctional: true,
        };
    }

    /**
     * Casts harpoon into oceanic depth zones to harvest aquatic catches and sea leviathans.
     */
    public static castHarpoon(
        tool: ActiveHarpoonTool,
        zoneType: OceanicDepthZoneType,
        castRoll = Math.random(),
        qualityRoll = Math.random(),
        trophyRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; result?: OceanicFishingResult; remainingDurability: number; reason?: string } {
        if (!tool || !tool.isFunctional || tool.currentDurability < this.DURABILITY_COST_PER_CAST) {
            return {
                success: false,
                remainingDurability: tool?.currentDurability ?? 0,
                reason: `Harpoon is damaged or lacks durability (requires ${this.DURABILITY_COST_PER_CAST}).`,
            };
        }

        const toolData = HARPOON_CATALOG[tool.toolType];
        if (!toolData) {
            return { success: false, remainingDurability: tool.currentDurability, reason: `Unknown harpoon model: ${String(tool.toolType)}` };
        }

        const zone = ZONE_CATALOG[zoneType];
        if (!zone) {
            return { success: false, remainingDurability: tool.currentDurability, reason: `Unknown oceanic zone: ${String(zoneType)}` };
        }

        if (tool.anglingPower < zone.minAnglingPowerRequired) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Insufficient angling power: requires ${zone.minAnglingPowerRequired}, harpoon has ${tool.anglingPower}.`,
            };
        }

        // Deduct durability
        tool.currentDurability -= this.DURABILITY_COST_PER_CAST;
        if (tool.currentDurability < this.DURABILITY_COST_PER_CAST) {
            tool.currentDurability = Math.max(0, tool.currentDurability);
            tool.isFunctional = false;
        }

        const safeRoll = Number.isFinite(castRoll) ? Math.max(0, Math.min(1, castRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > toolData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Catch escaped: line snapped against deep sea current, rolled ${rollPercent.toFixed(1)}, needed <= ${toolData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent angling quality score (0% to 100%) using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeQualityRoll = Number.isFinite(qualityRoll) ? Math.max(0, Math.min(1, qualityRoll)) : Math.random();
        const powerRatio = Math.min(1.0, tool.anglingPower / maxPower);
        const bonusPoints = (toolData.catchBonusPercent / maxBonus) * 20;
        const qualityScore = Math.max(0, Math.min(100, Math.round(
            (safeQualityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const yieldMultiplier = 0.8 + ((qualityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalYield = Math.round(zone.baseCatchYield * yieldMultiplier);

        const safeTrophyRoll = Number.isFinite(trophyRoll) ? Math.max(0, Math.min(1, trophyRoll)) : Math.random();
        const trophyCaught = (safeTrophyRoll * 100) <= (zone.baseRareTrophyChancePercent * (1 + qualityScore / 200));

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const fishingResult: OceanicFishingResult = {
            fishingId: `fish_${zoneType.toLowerCase()}_${uuid}`,
            zoneType,
            yieldCatchType: zone.yieldCatchType,
            finalCatchYield: finalYield,
            rareTrophyCaught: trophyCaught,
            anglingQualityPercent: qualityScore,
            fishedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            result: fishingResult,
            remainingDurability: tool.currentDurability,
        };
    }

    /**
     * Sharpens harpoon tip or repairs reel line.
     */
    public static repairHarpoon(
        tool: ActiveHarpoonTool,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!tool) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        tool.currentDurability = Math.min(tool.maxDurability, tool.currentDurability + amt);
        tool.isFunctional = tool.currentDurability >= this.DURABILITY_COST_PER_CAST;

        return {
            success: true,
            newDurability: tool.currentDurability,
            isFunctional: tool.isFunctional,
        };
    }
}