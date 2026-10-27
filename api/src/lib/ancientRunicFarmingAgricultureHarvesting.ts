import crypto from "node:crypto";

/**
 * Ancient Runic Farming Agriculture, Hydro-Irrigation & Crop Hybridization Engine for OpenAO MMORPG.
 * Simulates farming plots (Earthen Bed, Hydroponic Basin, Astral Greenhouse),
 * sacred crop seeds (Sunfire Wheat, Moonlit Nightshade, Starfall Lotus),
 * irrigation moisture levels (0% to 100%), fertilization quality bonuses, growth time progression,
 * harvest yields, and plot maintenance.
 */

export type FarmingPlotType = "EARTHEN_RAISED_BED" | "RUNIC_HYDROPONIC_BASIN" | "ASTRAL_GREENHOUSE_TIER";
export type SacredCropType = "SUNFIRE_WHEAT" | "MOONLIT_NIGHTSHADE" | "STARFALL_LOTUS";
export type CropGrowthStage = "SEED" | "SPROUT" | "MATURE_HARVESTABLE";

export interface FarmingPlotData {
    plotType: FarmingPlotType;
    maxWaterCapacity: number;
    growthSpeedMultiplier: number;
    baseSuccessRatePercent: number; // 0 to 100
    fertilizationQualityBonusPercent: number;
}

export interface SacredCropData {
    cropType: SacredCropType;
    baseGrowthDurationSeconds: number;
    baseHarvestYield: number;
    harvestItemName: string;
    secondaryProduceName: string;
}

export interface ActiveFarmingPlot {
    plotId: string;
    farmerPlayerId: string;
    plotType: FarmingPlotType;
    currentWater: number;
    maxWater: number;
    plantedCrop?: {
        cropType: SacredCropType;
        stage: CropGrowthStage;
        remainingGrowthSeconds: number;
        fertilizerQualityPercent: number;
        plantedEpochMs: number;
    };
    isFunctional: boolean;
}

export interface HarvestedCropResult {
    harvestId: string;
    cropType: SacredCropType;
    harvestedItemCount: number;
    secondaryProduceCount: number;
    produceQualityPercent: number; // 0 to 100
    harvestedEpochMs: number;
}

export const PLOT_CATALOG: Record<FarmingPlotType, FarmingPlotData> = {
    EARTHEN_RAISED_BED: { plotType: "EARTHEN_RAISED_BED", maxWaterCapacity: 100, growthSpeedMultiplier: 1.0, baseSuccessRatePercent: 85, fertilizationQualityBonusPercent: 10 },
    RUNIC_HYDROPONIC_BASIN: { plotType: "RUNIC_HYDROPONIC_BASIN", maxWaterCapacity: 200, growthSpeedMultiplier: 1.5, baseSuccessRatePercent: 92, fertilizationQualityBonusPercent: 20 },
    ASTRAL_GREENHOUSE_TIER: { plotType: "ASTRAL_GREENHOUSE_TIER", maxWaterCapacity: 350, growthSpeedMultiplier: 2.5, baseSuccessRatePercent: 99, fertilizationQualityBonusPercent: 35 },
};

export const CROP_CATALOG: Record<SacredCropType, SacredCropData> = {
    SUNFIRE_WHEAT: { cropType: "SUNFIRE_WHEAT", baseGrowthDurationSeconds: 120, baseHarvestYield: 5, harvestItemName: "SUNFIRE_WHEAT_GRAIN", secondaryProduceName: "SOLAR_CHAFF" },
    MOONLIT_NIGHTSHADE: { cropType: "MOONLIT_NIGHTSHADE", baseGrowthDurationSeconds: 200, baseHarvestYield: 8, harvestItemName: "MOONLIT_BERRIES", secondaryProduceName: "LUNAR_DEW" },
    STARFALL_LOTUS: { cropType: "STARFALL_LOTUS", baseGrowthDurationSeconds: 360, baseHarvestYield: 15, harvestItemName: "STARFALL_BLOSSOM", secondaryProduceName: "CELESTIAL_POLLEN" },
};

export class AncientRunicFarmingAgricultureHarvestingEngine {
    public static readonly WATER_COST_PER_PLANT = 20;

    /**
     * Constructs and initializes a farming plot or greenhouse.
     */
    public static constructPlot(
        farmerPlayerId: string,
        plotType: FarmingPlotType,
        currentEpochMs = Date.now()
    ): ActiveFarmingPlot {
        const data = PLOT_CATALOG[plotType];
        if (!data) {
            throw new Error(`Unsupported farming plot type: ${String(plotType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            plotId: `plot_${plotType.toLowerCase()}_${uuid}`,
            farmerPlayerId,
            plotType,
            currentWater: data.maxWaterCapacity,
            maxWater: data.maxWaterCapacity,
            isFunctional: true,
        };
    }

    /**
     * Plants sacred seeds into an active farming plot with fertilizer quality.
     */
    public static plantSeeds(
        plot: ActiveFarmingPlot,
        cropType: SacredCropType,
        fertilizerQualityRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; plantedStage?: CropGrowthStage; remainingWater: number; reason?: string } {
        if (!plot || !plot.isFunctional || plot.currentWater < this.WATER_COST_PER_PLANT) {
            return {
                success: false,
                remainingWater: plot?.currentWater ?? 0,
                reason: `Plot lacks water or is non-functional (requires ${this.WATER_COST_PER_PLANT} water).`,
            };
        }

        if (plot.plantedCrop) {
            return { success: false, remainingWater: plot.currentWater, reason: "Plot is already occupied by a growing crop." };
        }

        const cropData = CROP_CATALOG[cropType];
        if (!cropData) {
            return { success: false, remainingWater: plot.currentWater, reason: `Unknown crop type: ${String(cropType)}` };
        }

        const plotData = PLOT_CATALOG[plot.plotType];
        plot.currentWater -= this.WATER_COST_PER_PLANT;

        const safeRoll = Number.isFinite(fertilizerQualityRoll) ? Math.max(0, Math.min(1, fertilizerQualityRoll)) : Math.random();
        const qualityScore = Math.max(0, Math.min(100, Math.round(50 + (safeRoll * 30) + plotData.fertilizationQualityBonusPercent)));

        const duration = Math.max(10, Math.round(cropData.baseGrowthDurationSeconds / plotData.growthSpeedMultiplier));

        plot.plantedCrop = {
            cropType,
            stage: "SEED",
            remainingGrowthSeconds: duration,
            fertilizerQualityPercent: qualityScore,
            plantedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            plantedStage: "SEED",
            remainingWater: plot.currentWater,
        };
    }

    /**
     * Ticks growth progression timer for a planted crop with scaled SPROUT threshold.
     */
    public static tickCropGrowth(
        plot: ActiveFarmingPlot,
        elapsedSeconds = 1
    ): { stage: CropGrowthStage; remainingGrowthSeconds: number; isReadyForHarvest: boolean } {
        if (!plot || !plot.plantedCrop) {
            return { stage: "SEED", remainingGrowthSeconds: 0, isReadyForHarvest: false };
        }

        const sec = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 1;
        plot.plantedCrop.remainingGrowthSeconds = Math.max(0, plot.plantedCrop.remainingGrowthSeconds - sec);

        const plotData = PLOT_CATALOG[plot.plotType];
        const scaledDuration = (CROP_CATALOG[plot.plantedCrop.cropType].baseGrowthDurationSeconds / (plotData?.growthSpeedMultiplier ?? 1.0));

        if (plot.plantedCrop.remainingGrowthSeconds === 0) {
            plot.plantedCrop.stage = "MATURE_HARVESTABLE";
        } else if (plot.plantedCrop.remainingGrowthSeconds <= (scaledDuration * 0.5)) {
            plot.plantedCrop.stage = "SPROUT";
        }

        return {
            stage: plot.plantedCrop.stage,
            remainingGrowthSeconds: plot.plantedCrop.remainingGrowthSeconds,
            isReadyForHarvest: plot.plantedCrop.stage === "MATURE_HARVESTABLE",
        };
    }

    /**
     * Harvests mature crops from a plot.
     */
    public static harvestCrop(
        plot: ActiveFarmingPlot,
        currentEpochMs = Date.now()
    ): { success: boolean; result?: HarvestedCropResult; reason?: string } {
        if (!plot || !plot.plantedCrop) {
            return { success: false, reason: "Plot has no crops planted." };
        }

        if (plot.plantedCrop.stage !== "MATURE_HARVESTABLE") {
            return { success: false, reason: `Crop is not mature yet (${plot.plantedCrop.remainingGrowthSeconds}s remaining).` };
        }

        const cropData = CROP_CATALOG[plot.plantedCrop.cropType];
        const qualityMultiplier = 0.8 + ((plot.plantedCrop.fertilizerQualityPercent / 100) * 0.4); // 0.8 to 1.2x

        const finalYield = Math.max(1, Math.round(cropData.baseHarvestYield * qualityMultiplier));
        const secondaryYield = Math.max(1, Math.round(finalYield * 0.5));

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const harvest: HarvestedCropResult = {
            harvestId: `harvest_${uuid}`,
            cropType: plot.plantedCrop.cropType,
            harvestedItemCount: finalYield,
            secondaryProduceCount: secondaryYield,
            produceQualityPercent: plot.plantedCrop.fertilizerQualityPercent,
            harvestedEpochMs: currentEpochMs,
        };

        plot.plantedCrop = undefined; // Clear plot for next planting

        return {
            success: true,
            result: harvest,
        };
    }

    /**
     * Irrigates and refills plot water reservoir.
     */
    public static irrigatePlot(
        plot: ActiveFarmingPlot,
        waterAmount = 50
    ): { success: boolean; newWaterLevel: number; isFunctional: boolean } {
        if (!plot) return { success: false, newWaterLevel: 0, isFunctional: false };

        const amt = Number.isFinite(waterAmount) ? Math.max(0, waterAmount) : 50;
        plot.currentWater = Math.min(plot.maxWater, plot.currentWater + amt);
        plot.isFunctional = plot.currentWater > 0;

        return {
            success: true,
            newWaterLevel: plot.currentWater,
            isFunctional: plot.isFunctional,
        };
    }
}