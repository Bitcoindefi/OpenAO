import { describe, it, expect } from "vitest";
import {
    AncientRunicFarmingAgricultureHarvestingEngine,
    ActiveFarmingPlot,
} from "../lib/ancientRunicFarmingAgricultureHarvesting.js";

describe("AncientRunicFarmingAgricultureHarvestingEngine Agriculture & Hydroponics", () => {
    it("plants Starfall Lotus in Astral Greenhouse, progresses through SEED -> SPROUT -> MATURE properly, and harvests celestial produce", () => {
        const greenhouse = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_01", "ASTRAL_GREENHOUSE_TIER", 100000);
        expect(greenhouse.plotType).toBe("ASTRAL_GREENHOUSE_TIER");
        expect(greenhouse.currentWater).toBe(350);

        // Plant seeds: 2.5x growth speed (360s / 2.5 = 144s), 100% fertilizer quality
        const plantRes = AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(
            greenhouse,
            "STARFALL_LOTUS",
            0.5,
            100000
        );

        expect(plantRes.success).toBe(true);
        expect(plantRes.plantedStage).toBe("SEED");
        expect(greenhouse.plantedCrop?.remainingGrowthSeconds).toBe(144);

        // Tick 20 seconds (144 - 20 = 124s remaining > 72s half threshold) -> Stays SEED
        const tickSeed = AncientRunicFarmingAgricultureHarvestingEngine.tickCropGrowth(greenhouse, 20);
        expect(tickSeed.stage).toBe("SEED");
        expect(tickSeed.isReadyForHarvest).toBe(false);

        // Tick 60 more seconds (124 - 60 = 64s remaining <= 72s half threshold) -> Enters SPROUT
        const tickSprout = AncientRunicFarmingAgricultureHarvestingEngine.tickCropGrowth(greenhouse, 60);
        expect(tickSprout.stage).toBe("SPROUT");
        expect(tickSprout.isReadyForHarvest).toBe(false);

        // Tick remaining 64 seconds -> Enters MATURE_HARVESTABLE
        const tickMature = AncientRunicFarmingAgricultureHarvestingEngine.tickCropGrowth(greenhouse, 64);
        expect(tickMature.stage).toBe("MATURE_HARVESTABLE");
        expect(tickMature.isReadyForHarvest).toBe(true);

        // Harvest: 15 base * 1.20 = 18 Starfall Blossoms, 9 Celestial Pollen
        const harvestRes = AncientRunicFarmingAgricultureHarvestingEngine.harvestCrop(greenhouse, 100000);
        expect(harvestRes.success).toBe(true);
        expect(harvestRes.result?.cropType).toBe("STARFALL_LOTUS");
        expect(harvestRes.result?.harvestedItemCount).toBe(18);
        expect(harvestRes.result?.secondaryProduceCount).toBe(9);
        expect(harvestRes.result?.produceQualityPercent).toBe(100);
        expect(greenhouse.plantedCrop).toBeUndefined();
    });

    it("rejects planting when plot is already occupied", () => {
        const plot = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_02", "EARTHEN_RAISED_BED", 100000);

        AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(plot, "SUNFIRE_WHEAT");
        const failRes = AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(plot, "MOONLIT_NIGHTSHADE");

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("already occupied");
    });

    it("rejects harvesting immature crops", () => {
        const plot = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_03", "EARTHEN_RAISED_BED", 100000);

        AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(plot, "SUNFIRE_WHEAT");
        const failHarvest = AncientRunicFarmingAgricultureHarvestingEngine.harvestCrop(plot);

        expect(failHarvest.success).toBe(false);
        expect(failHarvest.reason).toContain("not mature yet");
    });

    it("irrigates dry plot and restores moisture", () => {
        const plot = AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("farmer_04", "EARTHEN_RAISED_BED", 100000);
        plot.currentWater = 0;
        plot.isFunctional = false;

        const rep = AncientRunicFarmingAgricultureHarvestingEngine.irrigatePlot(plot, 50);
        expect(rep.success).toBe(true);
        expect(rep.newWaterLevel).toBe(50);
        expect(rep.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported plot models", () => {
        expect(() => AncientRunicFarmingAgricultureHarvestingEngine.constructPlot("f", "CLAY_POT" as any)).toThrow(
            "Unsupported farming plot type"
        );

        expect(AncientRunicFarmingAgricultureHarvestingEngine.plantSeeds(null as any, "SUNFIRE_WHEAT").success).toBe(false);
        expect(AncientRunicFarmingAgricultureHarvestingEngine.harvestCrop(null as any).success).toBe(false);
        expect(AncientRunicFarmingAgricultureHarvestingEngine.irrigatePlot(null as any).success).toBe(false);
    });
});