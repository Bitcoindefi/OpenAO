import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherCobblerBootsEngine,
    ActiveCobblerTool,
} from "../lib/ancientRunicLeatherCobblerBoots.js";

describe("AncientRunicLeatherCobblerBootsEngine Footwear & Greaves", () => {
    it("crafts Celestial Voidwalker Treads on Void Cobbler Anvil achieving 100% precision and returns spliced pelts", () => {
        const tool = AncientRunicLeatherCobblerBootsEngine.forgeTool("cobbler_01", "CELESTIAL_VOID_COBBLER_ANVIL", 100000);
        expect(tool.toolType).toBe("CELESTIAL_VOID_COBBLER_ANVIL");
        expect(tool.currentDurability).toBe(310);

        const initialPelts = [
            "CELESTIAL_PHANTOM_STALKER_HIDE",
            "CELESTIAL_PHANTOM_STALKER_HIDE",
            "CELESTIAL_PHANTOM_STALKER_HIDE"
        ] as any[];

        const craftRes = AncientRunicLeatherCobblerBootsEngine.craftFootwear(
            tool,
            "CELESTIAL_VOIDWALKER_TREADS",
            initialPelts,
            0.1, // Success roll
            1.0, // Precision roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.footwear?.recipeType).toBe("CELESTIAL_VOIDWALKER_TREADS");
        expect(craftRes.footwear?.craftingPrecisionPercent).toBe(100);
        expect(craftRes.footwear?.finalMovementSpeedPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.footwear?.finalDodgeChancePercent).toBe(30); // 25 * 1.20 = 30%
        expect(craftRes.footwear?.consumedPeltCount).toBe(2);
        expect(craftRes.footwear?.consumedPeltType).toBe("CELESTIAL_PHANTOM_STALKER_HIDE");
        expect(craftRes.footwear?.remainingProvidedPelts.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles tool becoming non-functional after successful craft when durability falls below threshold", () => {
        const tool = AncientRunicLeatherCobblerBootsEngine.forgeTool("cobbler_wear", "HARDENED_BIRCH_COBBLER_LAST", 100000);
        tool.currentDurability = 15;
        expect(tool.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const craft1 = AncientRunicLeatherCobblerBootsEngine.craftFootwear(
            tool,
            "SWIFTSTRIDE_WINDRUNNER_BOOTS",
            ["SILKEN_SWIFT_FOX_PELT", "SILKEN_SWIFT_FOX_PELT"],
            0.1
        );
        expect(craft1.success).toBe(true);
        expect(craft1.remainingDurability).toBe(5);
        expect(tool.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const craft2 = AncientRunicLeatherCobblerBootsEngine.craftFootwear(
            tool,
            "SWIFTSTRIDE_WINDRUNNER_BOOTS",
            ["SILKEN_SWIFT_FOX_PELT", "SILKEN_SWIFT_FOX_PELT"]
        );
        expect(craft2.success).toBe(false);
        expect(craft2.reason).toContain("blunted or lacks durability");
    });

    it("rejects crafting when insufficient pelts are provided", () => {
        const tool = AncientRunicLeatherCobblerBootsEngine.forgeTool("cobbler_02", "HARDENED_BIRCH_COBBLER_LAST", 100000);

        const failRes = AncientRunicLeatherCobblerBootsEngine.craftFootwear(
            tool,
            "SHADOWDANCER_STALKER_GREAVES",
            ["ARMORED_WYVERN_WING_LEATHER"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient pelts");
        expect(tool.currentDurability).toBe(75);
    });

    it("handles stitching tear failure roll consuming durability", () => {
        const tool = AncientRunicLeatherCobblerBootsEngine.forgeTool("cobbler_03", "HARDENED_BIRCH_COBBLER_LAST", 100000); // 85% success

        const tear = AncientRunicLeatherCobblerBootsEngine.craftFootwear(
            tool,
            "SWIFTSTRIDE_WINDRUNNER_BOOTS",
            ["SILKEN_SWIFT_FOX_PELT", "SILKEN_SWIFT_FOX_PELT"],
            0.95
        );

        expect(tear.success).toBe(false);
        expect(tear.reason).toContain("stitching tore");
        expect(tool.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainTool based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const tool = AncientRunicLeatherCobblerBootsEngine.forgeTool("cobbler_04", "HARDENED_BIRCH_COBBLER_LAST", 100000);
        tool.currentDurability = 0;
        tool.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherCobblerBootsEngine.maintainTool(tool, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherCobblerBootsEngine.maintainTool(tool, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported tool models", () => {
        expect(() => AncientRunicLeatherCobblerBootsEngine.forgeTool("c", "PLASTIC_SHOE_HORN" as any)).toThrow(
            "Unsupported cobbler tool type"
        );

        const invalidTool: ActiveCobblerTool = {
            toolId: "bad",
            cobblerPlayerId: "p",
            toolType: "HORN" as any,
            currentDurability: 50,
            maxDurability: 50,
            cobblerPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherCobblerBootsEngine.craftFootwear(invalidTool, "SWIFTSTRIDE_WINDRUNNER_BOOTS", ["SILKEN_SWIFT_FOX_PELT", "SILKEN_SWIFT_FOX_PELT"]).success).toBe(false);
        expect(AncientRunicLeatherCobblerBootsEngine.craftFootwear(null as any, "SWIFTSTRIDE_WINDRUNNER_BOOTS", []).success).toBe(false);
        expect(AncientRunicLeatherCobblerBootsEngine.maintainTool(null as any).success).toBe(false);
    });
});