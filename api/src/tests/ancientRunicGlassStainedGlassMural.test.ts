import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassStainedGlassMuralEngine,
    ActiveGlazierTable,
} from "../lib/ancientRunicGlassStainedGlassMural.js";

describe("AncientRunicGlassStainedGlassMuralEngine Stained Glass & Sanctuary Murals", () => {
    it("crafts Celestial Void Oculus in Prism Sanctum achieving 100% blessing and returns spliced sheets", () => {
        const table = AncientRunicGlassStainedGlassMuralEngine.constructTable("glazier_01", "CELESTIAL_VOID_PRISM_SANCTUM", 100000);
        expect(table.tableType).toBe("CELESTIAL_VOID_PRISM_SANCTUM");
        expect(table.currentDurability).toBe(310);

        const initialSheets = [
            "CELESTIAL_VOID_PRISMATIC_GLASS",
            "CELESTIAL_VOID_PRISMATIC_GLASS",
            "CELESTIAL_VOID_PRISMATIC_GLASS"
        ] as any[];

        const craftRes = AncientRunicGlassStainedGlassMuralEngine.craftWindow(
            table,
            "CELESTIAL_VOID_OCULUS",
            initialSheets,
            0.1, // Success roll
            1.0, // Blessing roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.window?.recipeType).toBe("CELESTIAL_VOID_OCULUS");
        expect(craftRes.window?.divineBlessingPercent).toBe(100);
        expect(craftRes.window?.finalSanctuaryHealPerSec).toBe(216); // 180 * 1.20 = 216 HP/s
        expect(craftRes.window?.finalDamageMitigationPercent).toBe(36); // 30 * 1.20 = 36%
        expect(craftRes.window?.consumedGlassCount).toBe(2);
        expect(craftRes.window?.consumedGlassType).toBe("CELESTIAL_VOID_PRISMATIC_GLASS");
        expect(craftRes.window?.remainingProvidedSheets.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles table becoming non-functional after successful craft when durability falls below threshold", () => {
        const table = AncientRunicGlassStainedGlassMuralEngine.constructTable("glazier_wear", "LEADBOUND_GLAZIER_TABLE", 100000);
        table.currentDurability = 15;
        expect(table.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassStainedGlassMuralEngine.craftWindow(
            table,
            "SANCTUARY_ROSE_WINDOW",
            ["COBALT_ARCANE_GLASS", "COBALT_ARCANE_GLASS"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(table.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicGlassStainedGlassMuralEngine.craftWindow(
            table,
            "SANCTUARY_ROSE_WINDOW",
            ["COBALT_ARCANE_GLASS", "COBALT_ARCANE_GLASS"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("cracked or lacks durability");
    });

    it("rejects crafting when insufficient glass sheets are provided", () => {
        const table = AncientRunicGlassStainedGlassMuralEngine.constructTable("glazier_02", "LEADBOUND_GLAZIER_TABLE", 100000);

        const failRes = AncientRunicGlassStainedGlassMuralEngine.craftWindow(
            table,
            "ARCHANGEL_DAWN_MOSAIC",
            ["CRIMSON_DAWN_GLASS"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass sheets");
        expect(table.currentDurability).toBe(75);
    });

    it("handles lead came warping failure roll consuming durability and glass sheets", () => {
        const table = AncientRunicGlassStainedGlassMuralEngine.constructTable("glazier_03", "LEADBOUND_GLAZIER_TABLE", 100000); // 85% success

        const fail = AncientRunicGlassStainedGlassMuralEngine.craftWindow(
            table,
            "SANCTUARY_ROSE_WINDOW",
            ["COBALT_ARCANE_GLASS", "COBALT_ARCANE_GLASS", "COBALT_ARCANE_GLASS"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("soldering warped");
        expect(fail.remainingProvidedSheets?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(table.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainTable based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const table = AncientRunicGlassStainedGlassMuralEngine.constructTable("glazier_04", "LEADBOUND_GLAZIER_TABLE", 100000);
        table.currentDurability = 0;
        table.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassStainedGlassMuralEngine.maintainTable(table, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassStainedGlassMuralEngine.maintainTable(table, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported table models", () => {
        expect(() => AncientRunicGlassStainedGlassMuralEngine.constructTable("g", "PLASTIC_MAT" as any)).toThrow(
            "Unsupported glazier table type"
        );

        const invalidTable: ActiveGlazierTable = {
            tableId: "bad",
            glazierPlayerId: "p",
            tableType: "MAT" as any,
            currentDurability: 50,
            maxDurability: 50,
            glazieryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassStainedGlassMuralEngine.craftWindow(invalidTable, "SANCTUARY_ROSE_WINDOW", ["COBALT_ARCANE_GLASS", "COBALT_ARCANE_GLASS"]).success).toBe(false);
        expect(AncientRunicGlassStainedGlassMuralEngine.craftWindow(null as any, "SANCTUARY_ROSE_WINDOW", []).success).toBe(false);
        expect(AncientRunicGlassStainedGlassMuralEngine.maintainTable(null as any).success).toBe(false);
    });
});