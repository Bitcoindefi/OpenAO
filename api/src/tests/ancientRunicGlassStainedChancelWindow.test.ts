import { describe, it, expect } from "vitest";
import {
    AncientRunicGlassStainedChancelWindowEngine,
    ActiveWindowAssemblyBench,
} from "../lib/ancientRunicGlassStainedChancelWindow.js";

describe("AncientRunicGlassStainedChancelWindowEngine Window Benches & Rose Windows", () => {
    it("assembles Celestial Void Seraphic Rose Window in Chancel Sanctum achieving 100% sanctity and returns spliced plates", () => {
        const bench = AncientRunicGlassStainedChancelWindowEngine.constructBench("glazier_01", "CELESTIAL_VOID_CHANCEL_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_CHANCEL_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialPlates = [
            "CELESTIAL_VOID_HOLY_LIGHT_PLATE",
            "CELESTIAL_VOID_HOLY_LIGHT_PLATE",
            "CELESTIAL_VOID_HOLY_LIGHT_PLATE"
        ] as any[];

        const craftRes = AncientRunicGlassStainedChancelWindowEngine.assembleWindow(
            bench,
            "CELESTIAL_VOID_SERAPHIC_ROSE_WINDOW",
            initialPlates,
            0.1, // Success roll
            1.0, // Sanctity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.window?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_ROSE_WINDOW");
        expect(craftRes.window?.sanctuarySanctityPercent).toBe(100);
        expect(craftRes.window?.finalHolyWardingPercent).toBe(100); // 85 * 1.20 = 102 -> clamped to 100%
        expect(craftRes.window?.finalHealthRegenAuraPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.window?.consumedGlassCount).toBe(2);
        expect(craftRes.window?.consumedGlassType).toBe("CELESTIAL_VOID_HOLY_LIGHT_PLATE");
        expect(craftRes.window?.remainingProvidedGlass.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicGlassStainedChancelWindowEngine.constructBench("glazier_wear", "CEDAR_WINDOW_ASSEMBLY_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicGlassStainedChancelWindowEngine.assembleWindow(
            bench,
            "SAINT_BENEDICT_PROTECTIVE_WINDOW",
            ["CATHEDRAL_BLUE_RONDEL", "CATHEDRAL_BLUE_RONDEL"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(bench.isFunctional).toBe(false);

        // Subsequent craft is rejected and returns fallback array
        const res2 = AncientRunicGlassStainedChancelWindowEngine.assembleWindow(
            bench,
            "SAINT_BENEDICT_PROTECTIVE_WINDOW",
            ["CATHEDRAL_BLUE_RONDEL", "CATHEDRAL_BLUE_RONDEL"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("rickety or lacks durability");
        expect(res2.remainingProvidedGlass.length).toBe(2);
    });

    it("rejects crafting when insufficient glass is provided and returns provided glass", () => {
        const bench = AncientRunicGlassStainedChancelWindowEngine.constructBench("glazier_02", "CEDAR_WINDOW_ASSEMBLY_BENCH");

        const failRes = AncientRunicGlassStainedChancelWindowEngine.assembleWindow(
            bench,
            "SUNBURST_HOLY_BLESSING_CHANCEL",
            ["RUBY_RED_FLASHED_GLASS_PANE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient glass pane");
        expect(failRes.remainingProvidedGlass.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles lead came buckled failure roll consuming durability and glass panes", () => {
        const bench = AncientRunicGlassStainedChancelWindowEngine.constructBench("glazier_03", "CEDAR_WINDOW_ASSEMBLY_BENCH"); // 85% success

        const fail = AncientRunicGlassStainedChancelWindowEngine.assembleWindow(
            bench,
            "SAINT_BENEDICT_PROTECTIVE_WINDOW",
            ["CATHEDRAL_BLUE_RONDEL", "CATHEDRAL_BLUE_RONDEL", "CATHEDRAL_BLUE_RONDEL"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("buckled");
        expect(fail.remainingProvidedGlass?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(bench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const bench = AncientRunicGlassStainedChancelWindowEngine.constructBench("glazier_04", "CEDAR_WINDOW_ASSEMBLY_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicGlassStainedChancelWindowEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicGlassStainedChancelWindowEngine.maintainBench(bench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicGlassStainedChancelWindowEngine.constructBench("g", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported window assembly bench type"
        );

        const invalidBench: ActiveWindowAssemblyBench = {
            benchId: "bad",
            glazierPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            glazieryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicGlassStainedChancelWindowEngine.assembleWindow(invalidBench, "SAINT_BENEDICT_PROTECTIVE_WINDOW", ["CATHEDRAL_BLUE_RONDEL", "CATHEDRAL_BLUE_RONDEL"]).success).toBe(false);
        expect(AncientRunicGlassStainedChancelWindowEngine.assembleWindow(null as any, "SAINT_BENEDICT_PROTECTIVE_WINDOW", []).success).toBe(false);
        expect(AncientRunicGlassStainedChancelWindowEngine.maintainBench(null as any).success).toBe(false);
    });
});