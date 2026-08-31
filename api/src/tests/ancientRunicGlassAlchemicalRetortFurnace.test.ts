import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassAlchemicalRetortFurnaceEngine,
    ActiveRetortFurnace,
} from "../lib/ancientRunicGlassAlchemicalRetortFurnace.js";

describe("AncientRunicGlassAlchemicalRetortFurnaceEngine Retort Furnaces & Alchemical Glassware", () => {
    it("blows Celestial Void Philosopher Crucible in Distillation Sanctum achieving 100% thermal shock resistance and returns spliced batches", () => {
        const furnace = AncientRunicGlassAlchemicalRetortFurnaceEngine.constructFurnace("glassblower_01", "CELESTIAL_VOID_DISTILLATION_SANCTUM");
        expect(furnace.furnaceType).toBe("CELESTIAL_VOID_DISTILLATION_SANCTUM");
        expect(furnace.currentDurability).toBe(310);

        const initialBatches = [
            "CELESTIAL_VOID_LUMINESCENT_GLASS_BATCH",
            "CELESTIAL_VOID_LUMINESCENT_GLASS_BATCH",
            "CELESTIAL_VOID_LUMINESCENT_GLASS_BATCH"
        ] as any[];

        const craftRes = AncientRunicGlassAlchemicalRetortFurnaceEngine.blowGlassware(
            furnace,
            "CELESTIAL_VOID_PHILOSOPHER_CRUCIBLE",
            initialBatches,
            0.1, // Success roll
            1.0, // Thermal roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.glassware?.recipeType).toBe("CELESTIAL_VOID_PHILOSOPHER_CRUCIBLE");
        expect(craftRes.glassware?.thermalShockResistancePercent).toBe(100);
        expect(craftRes.glassware?.finalPotionBrewPotencyPercent).toBe(100); // 85 * 1.20 = 102 -> clamped to 100%
        expect(craftRes.glassware?.finalElixirYieldBonusPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.glassware?.consumedBatchCount).toBe(2);
        expect(craftRes.glassware?.consumedBatchType).toBe("CELESTIAL_VOID_LUMINESCENT_GLASS_BATCH");
        expect(craftRes.glassware?.remainingProvidedBatches.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles furnace becoming non-functional after successful craft when durability falls below threshold", () => {
        const furnace = AncientRunicGlassAlchemicalRetortFurnaceEngine.constructFurnace("glassblower_wear", "CEDAR_GLASS_RETORT_FURNACE");
        furnace.currentDurability = 15;
        expect(furnace.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassAlchemicalRetortFurnaceEngine.blowGlassware(
            furnace,
            "ALCHEMIST_CONDENSER_ALEMBIC",
            ["QUARTZ_SILICA_SAND_BATCH", "QUARTZ_SILICA_SAND_BATCH"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(furnace.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassAlchemicalRetortFurnaceEngine.blowGlassware(
            furnace,
            "ALCHEMIST_CONDENSER_ALEMBIC",
            ["QUARTZ_SILICA_SAND_BATCH", "QUARTZ_SILICA_SAND_BATCH"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("cold or lacks durability");
        expect(res2.remainingProvidedBatches.length).toBe(2);
    });

    it("rejects crafting when insufficient batch is provided and returns provided batches", () => {
        const furnace = AncientRunicGlassAlchemicalRetortFurnaceEngine.constructFurnace("glassblower_02", "CEDAR_GLASS_RETORT_FURNACE");

        const failRes = AncientRunicGlassAlchemicalRetortFurnaceEngine.blowGlassware(
            furnace,
            "ARCANE_DISTILLATION_RETORT",
            ["BORAX_FLUX_GLASS_BATCH"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass batch");
        expect(failRes.remainingProvidedBatches.length).toBe(1);
        expect(furnace.currentDurability).toBe(75);
    });

    it("handles retort cracked thermal failure roll consuming durability and glass batches", () => {
        const furnace = AncientRunicGlassAlchemicalRetortFurnaceEngine.constructFurnace("glassblower_03", "CEDAR_GLASS_RETORT_FURNACE"); // 85% success

        const fail = AncientRunicGlassAlchemicalRetortFurnaceEngine.blowGlassware(
            furnace,
            "ALCHEMIST_CONDENSER_ALEMBIC",
            ["QUARTZ_SILICA_SAND_BATCH", "QUARTZ_SILICA_SAND_BATCH", "QUARTZ_SILICA_SAND_BATCH"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("thermal shock");
        expect(fail.remainingProvidedBatches?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(furnace.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainFurnace based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const furnace = AncientRunicGlassAlchemicalRetortFurnaceEngine.constructFurnace("glassblower_04", "CEDAR_GLASS_RETORT_FURNACE");
        furnace.currentDurability = 0;
        furnace.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassAlchemicalRetortFurnaceEngine.maintainFurnace(furnace, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassAlchemicalRetortFurnaceEngine.maintainFurnace(furnace, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported furnace models", () => {
        expect(() => AncientRunicGlassAlchemicalRetortFurnaceEngine.constructFurnace("g", "PLASTIC_FURNACE" as any)).toThrow(
            "Unsupported retort furnace type"
        );

        const invalidFurnace: ActiveRetortFurnace = {
            furnaceId: "bad",
            glassblowerPlayerId: "p",
            furnaceType: "FURNACE" as any,
            currentDurability: 50,
            maxDurability: 50,
            glassblowingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassAlchemicalRetortFurnaceEngine.blowGlassware(invalidFurnace, "ALCHEMIST_CONDENSER_ALEMBIC", ["QUARTZ_SILICA_SAND_BATCH", "QUARTZ_SILICA_SAND_BATCH"]).success).toBe(false);
        expect(AncientRunicGlassAlchemicalRetortFurnaceEngine.blowGlassware(null as any, "ALCHEMIST_CONDENSER_ALEMBIC", []).success).toBe(false);
        expect(AncientRunicGlassAlchemicalRetortFurnaceEngine.maintainFurnace(null as any).success).toBe(false);
    });
});