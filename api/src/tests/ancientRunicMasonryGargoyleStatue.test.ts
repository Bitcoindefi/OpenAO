import { describe, it, expect } from "vitest";
import {
    AncientRunicMasonryGargoyleStatueEngine,
    ActiveSculptorTable,
} from "../lib/ancientRunicMasonryGargoyleStatue.js";

describe("AncientRunicMasonryGargoyleStatueEngine Sentinel Statues & Colossus Wards", () => {
    it("crafts Celestial Void Colossus Ward on Colossus Anvil achieving 100% resilience and returns spliced blocks", () => {
        const table = AncientRunicMasonryGargoyleStatueEngine.constructTable("sculptor_01", "CELESTIAL_VOID_COLOSSUS_ANVIL", 100000);
        expect(table.tableType).toBe("CELESTIAL_VOID_COLOSSUS_ANVIL");
        expect(table.currentDurability).toBe(310);

        const initialBlocks = [
            "CELESTIAL_VOIDSTONE_SLAB",
            "CELESTIAL_VOIDSTONE_SLAB",
            "CELESTIAL_VOIDSTONE_SLAB"
        ] as any[];

        const craftRes = AncientRunicMasonryGargoyleStatueEngine.craftStatue(
            table,
            "CELESTIAL_VOID_COLOSSUS_WARD",
            initialBlocks,
            0.1, // Success roll
            1.0, // Resilience roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.statue?.recipeType).toBe("CELESTIAL_VOID_COLOSSUS_WARD");
        expect(craftRes.statue?.bastionResiliencePercent).toBe(100);
        expect(craftRes.statue?.finalDefenseArmor).toBe(336); // 280 * 1.20 = 336
        expect(craftRes.statue?.finalThreatGenerationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.statue?.consumedBlockCount).toBe(2);
        expect(craftRes.statue?.consumedBlockType).toBe("CELESTIAL_VOIDSTONE_SLAB");
        expect(craftRes.statue?.remainingProvidedBlocks.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles table becoming non-functional after successful craft when durability falls below threshold", () => {
        const table = AncientRunicMasonryGargoyleStatueEngine.constructTable("sculptor_wear", "HARDENED_GRANITE_BANKER_TABLE", 100000);
        table.currentDurability = 15;
        expect(table.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicMasonryGargoyleStatueEngine.craftStatue(
            table,
            "GARGOYLE_LOOKOUT_SENTRY",
            ["WEATHERED_BASALT_BLOCK", "WEATHERED_BASALT_BLOCK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(table.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicMasonryGargoyleStatueEngine.craftStatue(
            table,
            "GARGOYLE_LOOKOUT_SENTRY",
            ["WEATHERED_BASALT_BLOCK", "WEATHERED_BASALT_BLOCK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("cracked or lacks durability");
    });

    it("rejects crafting when insufficient stone blocks are provided", () => {
        const table = AncientRunicMasonryGargoyleStatueEngine.constructTable("sculptor_02", "HARDENED_GRANITE_BANKER_TABLE", 100000);

        const failRes = AncientRunicMasonryGargoyleStatueEngine.craftStatue(
            table,
            "ARCHON_BASTION_MONUMENT",
            ["ARCANE_MARBLE_MONOLITH"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient stone blocks");
        expect(table.currentDurability).toBe(75);
    });

    it("handles fault line fracture failure roll consuming durability and stone blocks", () => {
        const table = AncientRunicMasonryGargoyleStatueEngine.constructTable("sculptor_03", "HARDENED_GRANITE_BANKER_TABLE", 100000); // 85% success

        const fail = AncientRunicMasonryGargoyleStatueEngine.craftStatue(
            table,
            "GARGOYLE_LOOKOUT_SENTRY",
            ["WEATHERED_BASALT_BLOCK", "WEATHERED_BASALT_BLOCK", "WEATHERED_BASALT_BLOCK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("fault line");
        expect(fail.remainingProvidedBlocks?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(table.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainTable based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const table = AncientRunicMasonryGargoyleStatueEngine.constructTable("sculptor_04", "HARDENED_GRANITE_BANKER_TABLE", 100000);
        table.currentDurability = 0;
        table.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicMasonryGargoyleStatueEngine.maintainTable(table, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicMasonryGargoyleStatueEngine.maintainTable(table, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported table models", () => {
        expect(() => AncientRunicMasonryGargoyleStatueEngine.constructTable("s", "PLASTIC_CRATE" as any)).toThrow(
            "Unsupported sculptor table type"
        );

        const invalidTable: ActiveSculptorTable = {
            tableId: "bad",
            sculptorPlayerId: "p",
            tableType: "CRATE" as any,
            currentDurability: 50,
            maxDurability: 50,
            sculptingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicMasonryGargoyleStatueEngine.craftStatue(invalidTable, "GARGOYLE_LOOKOUT_SENTRY", ["WEATHERED_BASALT_BLOCK", "WEATHERED_BASALT_BLOCK"]).success).toBe(false);
        expect(AncientRunicMasonryGargoyleStatueEngine.craftStatue(null as any, "GARGOYLE_LOOKOUT_SENTRY", []).success).toBe(false);
        expect(AncientRunicMasonryGargoyleStatueEngine.maintainTable(null as any).success).toBe(false);
    });
});