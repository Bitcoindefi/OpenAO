import { describe, it, expect } from "vitest";
import {
    AncientRunicMiningExcavationProspectingEngine,
    ActiveMiningTool,
} from "../lib/ancientRunicMiningExcavationProspecting.js";

describe("AncientRunicMiningExcavationProspectingEngine Ore Extraction & Geodes", () => {
    it("excavates Void Adamantite Lode with Celestial Void Sledge achieving 100% depth and discovering rare geode", () => {
        const tool = AncientRunicMiningExcavationProspectingEngine.forgeTool("miner_01", "CELESTIAL_VOID_CORE_SLEDGE", 100000);
        expect(tool.toolType).toBe("CELESTIAL_VOID_CORE_SLEDGE");
        expect(tool.currentDurability).toBe(310);

        const excRes = AncientRunicMiningExcavationProspectingEngine.excavateVein(
            tool,
            "VOID_ADAMANTITE_LODE",
            0.1, // Success roll
            1.0, // Depth roll 1.0 -> 40 + 40 + 20 = 100%
            0.05, // Gem roll
            100000
        );

        expect(excRes.success).toBe(true);
        expect(excRes.result?.veinType).toBe("VOID_ADAMANTITE_LODE");
        expect(excRes.result?.extractedOreType).toBe("VOID_ADAMANTITE_CORE");
        expect(excRes.result?.prospectingDepthPercent).toBe(100);
        expect(excRes.result?.finalOreYield).toBe(96); // 80 * 1.20 = 96
        expect(excRes.result?.rareGemDiscovered).toBe(true);
        expect(excRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles tool becoming non-functional after successful excavation when durability falls below threshold", () => {
        const tool = AncientRunicMiningExcavationProspectingEngine.forgeTool("miner_wear", "NOVICE_BRONZE_PICKAXE", 100000);
        tool.currentDurability = 15;
        expect(tool.isFunctional).toBe(true);

        // First excavation succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const exc1 = AncientRunicMiningExcavationProspectingEngine.excavateVein(tool, "GRANITE_COPPER_DEPOSIT", 0.1);
        expect(exc1.success).toBe(true);
        expect(exc1.remainingDurability).toBe(5);
        expect(tool.isFunctional).toBe(false);

        // Subsequent excavation is rejected
        const exc2 = AncientRunicMiningExcavationProspectingEngine.excavateVein(tool, "GRANITE_COPPER_DEPOSIT");
        expect(exc2.success).toBe(false);
        expect(exc2.reason).toContain("blunted or lacks durability");
    });

    it("rejects excavation when tool has insufficient mining power for hard veins", () => {
        const tool = AncientRunicMiningExcavationProspectingEngine.forgeTool("miner_02", "NOVICE_BRONZE_PICKAXE", 100000); // Power 25

        const failRes = AncientRunicMiningExcavationProspectingEngine.excavateVein(
            tool,
            "VOID_ADAMANTITE_LODE" // Requires Power 100
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient mining power");
        expect(tool.currentDurability).toBe(75);
    });

    it("handles excavation rock collapse failure roll consuming durability", () => {
        const tool = AncientRunicMiningExcavationProspectingEngine.forgeTool("miner_03", "NOVICE_BRONZE_PICKAXE", 100000); // 85% success

        const collapse = AncientRunicMiningExcavationProspectingEngine.excavateVein(
            tool,
            "GRANITE_COPPER_DEPOSIT",
            0.95
        );

        expect(collapse.success).toBe(false);
        expect(collapse.reason).toContain("Excavation collapsed");
        expect(tool.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in sharpenTool based on DURABILITY_COST_PER_EXCAVATION threshold", () => {
        const tool = AncientRunicMiningExcavationProspectingEngine.forgeTool("miner_04", "NOVICE_BRONZE_PICKAXE", 100000);
        tool.currentDurability = 0;
        tool.isFunctional = false;

        // Sharpen 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicMiningExcavationProspectingEngine.sharpenTool(tool, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Sharpen 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicMiningExcavationProspectingEngine.sharpenTool(tool, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported tool models", () => {
        expect(() => AncientRunicMiningExcavationProspectingEngine.forgeTool("m", "TOOTHPICK" as any)).toThrow(
            "Unsupported mining tool type"
        );

        const invalidTool: ActiveMiningTool = {
            toolId: "bad",
            minerPlayerId: "p",
            toolType: "SPOON" as any,
            currentDurability: 50,
            maxDurability: 50,
            miningPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicMiningExcavationProspectingEngine.excavateVein(invalidTool, "GRANITE_COPPER_DEPOSIT").success).toBe(false);
        expect(AncientRunicMiningExcavationProspectingEngine.excavateVein(null as any, "GRANITE_COPPER_DEPOSIT").success).toBe(false);
        expect(AncientRunicMiningExcavationProspectingEngine.sharpenTool(null as any).success).toBe(false);
    });
});