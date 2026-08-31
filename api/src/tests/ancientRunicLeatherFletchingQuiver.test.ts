import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherFletchingQuiverEngine,
    ActiveFletchingTable,
} from "../lib/ancientRunicLeatherFletchingQuiver.js";

describe("AncientRunicLeatherFletchingQuiverEngine Quivers & Bolt Pouches", () => {
    it("crafts Celestial Voidfang Endless Quiver in Fletcher Sanctum achieving 100% craftsmanship and returns spliced plumes", () => {
        const table = AncientRunicLeatherFletchingQuiverEngine.constructTable("fletcher_01", "CELESTIAL_VOID_FLETCHER_SANCTUM", 100000);
        expect(table.tableType).toBe("CELESTIAL_VOID_FLETCHER_SANCTUM");
        expect(table.currentDurability).toBe(310);

        const initialMaterials = [
            "CELESTIAL_VOID_RAPTOR_PLUME",
            "CELESTIAL_VOID_RAPTOR_PLUME",
            "CELESTIAL_VOID_RAPTOR_PLUME"
        ] as any[];

        const craftRes = AncientRunicLeatherFletchingQuiverEngine.craftQuiver(
            table,
            "CELESTIAL_VOIDFANG_ENDLESS_QUIVER",
            initialMaterials,
            0.1, // Success roll
            1.0, // Craftsmanship roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.quiver?.recipeType).toBe("CELESTIAL_VOIDFANG_ENDLESS_QUIVER");
        expect(craftRes.quiver?.craftsmanshipPercent).toBe(100);
        expect(craftRes.quiver?.finalArrowCapacity).toBe(432); // 360 * 1.20 = 432
        expect(craftRes.quiver?.finalReloadSpeedHastePercent).toBe(48); // 40 * 1.20 = 48%
        expect(craftRes.quiver?.consumedMaterialCount).toBe(2);
        expect(craftRes.quiver?.consumedMaterialType).toBe("CELESTIAL_VOID_RAPTOR_PLUME");
        expect(craftRes.quiver?.remainingProvidedMaterials.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles table becoming non-functional after successful craft when durability falls below threshold", () => {
        const table = AncientRunicLeatherFletchingQuiverEngine.constructTable("fletcher_wear", "YEW_FLETCHING_TABLE", 100000);
        table.currentDurability = 15;
        expect(table.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherFletchingQuiverEngine.craftQuiver(
            table,
            "WINDRUNNER_RANGER_QUIVER",
            ["SUPPLE_STALKER_LEATHER", "SUPPLE_STALKER_LEATHER"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(table.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicLeatherFletchingQuiverEngine.craftQuiver(
            table,
            "WINDRUNNER_RANGER_QUIVER",
            ["SUPPLE_STALKER_LEATHER", "SUPPLE_STALKER_LEATHER"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("loose or lacks durability");
    });

    it("rejects crafting when insufficient materials are provided", () => {
        const table = AncientRunicLeatherFletchingQuiverEngine.constructTable("fletcher_02", "YEW_FLETCHING_TABLE", 100000);

        const failRes = AncientRunicLeatherFletchingQuiverEngine.craftQuiver(
            table,
            "PHOENIXFIRE_CROSSBOW_POUCH",
            ["PHOENIX_FEATHER_CREST"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient materials");
        expect(table.currentDurability).toBe(75);
    });

    it("handles sinew seam fraying failure roll consuming durability and materials", () => {
        const table = AncientRunicLeatherFletchingQuiverEngine.constructTable("fletcher_03", "YEW_FLETCHING_TABLE", 100000); // 85% success

        const fail = AncientRunicLeatherFletchingQuiverEngine.craftQuiver(
            table,
            "WINDRUNNER_RANGER_QUIVER",
            ["SUPPLE_STALKER_LEATHER", "SUPPLE_STALKER_LEATHER", "SUPPLE_STALKER_LEATHER"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("frayed");
        expect(fail.remainingProvidedMaterials?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(table.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainTable based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const table = AncientRunicLeatherFletchingQuiverEngine.constructTable("fletcher_04", "YEW_FLETCHING_TABLE", 100000);
        table.currentDurability = 0;
        table.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherFletchingQuiverEngine.maintainTable(table, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherFletchingQuiverEngine.maintainTable(table, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported table models", () => {
        expect(() => AncientRunicLeatherFletchingQuiverEngine.constructTable("f", "PLASTIC_BOARD" as any)).toThrow(
            "Unsupported fletching table type"
        );

        const invalidTable: ActiveFletchingTable = {
            tableId: "bad",
            fletcherPlayerId: "p",
            tableType: "BOARD" as any,
            currentDurability: 50,
            maxDurability: 50,
            fletchingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherFletchingQuiverEngine.craftQuiver(invalidTable, "WINDRUNNER_RANGER_QUIVER", ["SUPPLE_STALKER_LEATHER", "SUPPLE_STALKER_LEATHER"]).success).toBe(false);
        expect(AncientRunicLeatherFletchingQuiverEngine.craftQuiver(null as any, "WINDRUNNER_RANGER_QUIVER", []).success).toBe(false);
        expect(AncientRunicLeatherFletchingQuiverEngine.maintainTable(null as any).success).toBe(false);
    });
});