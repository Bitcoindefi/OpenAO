import { describe, it, expect } from "vitest";
import {
    AncientRunicFishingOceanicHarpoonEngine,
    ActiveHarpoonTool,
} from "../lib/ancientRunicFishingOceanicHarpoon.js";

describe("AncientRunicFishingOceanicHarpoonEngine Deep-Sea Angling & Leviathans", () => {
    it("catches Celestial Leviathan Heart in Astral Whirlpool with Void Ballista achieving 100% quality and trophy", () => {
        const tool = AncientRunicFishingOceanicHarpoonEngine.forgeHarpoon("angler_01", "CELESTIAL_VOID_LEVIATHAN_BALLISTA", 100000);
        expect(tool.toolType).toBe("CELESTIAL_VOID_LEVIATHAN_BALLISTA");
        expect(tool.currentDurability).toBe(310);

        const fishRes = AncientRunicFishingOceanicHarpoonEngine.castHarpoon(
            tool,
            "CELESTIAL_ASTRAL_WHIRLPOOL",
            0.1, // Success roll
            1.0, // Quality roll 1.0 -> 40 + 40 + 20 = 100%
            0.05, // Trophy roll
            100000
        );

        expect(fishRes.success).toBe(true);
        expect(fishRes.result?.zoneType).toBe("CELESTIAL_ASTRAL_WHIRLPOOL");
        expect(fishRes.result?.yieldCatchType).toBe("CELESTIAL_LEVIATHAN_HEART");
        expect(fishRes.result?.anglingQualityPercent).toBe(100);
        expect(fishRes.result?.finalCatchYield).toBe(96); // 80 * 1.20 = 96
        expect(fishRes.result?.rareTrophyCaught).toBe(true);
        expect(fishRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles tool becoming non-functional after successful cast when durability falls below threshold", () => {
        const tool = AncientRunicFishingOceanicHarpoonEngine.forgeHarpoon("angler_wear", "REINFORCED_BONE_HARPOON", 100000);
        tool.currentDurability = 15;
        expect(tool.isFunctional).toBe(true);

        // First cast succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const cast1 = AncientRunicFishingOceanicHarpoonEngine.castHarpoon(tool, "COASTAL_REEF_SHALLOWS", 0.1);
        expect(cast1.success).toBe(true);
        expect(cast1.remainingDurability).toBe(5);
        expect(tool.isFunctional).toBe(false);

        // Subsequent cast is rejected
        const cast2 = AncientRunicFishingOceanicHarpoonEngine.castHarpoon(tool, "COASTAL_REEF_SHALLOWS");
        expect(cast2.success).toBe(false);
        expect(cast2.reason).toContain("damaged or lacks durability");
    });

    it("rejects fishing when harpoon has insufficient angling power for deep zones", () => {
        const tool = AncientRunicFishingOceanicHarpoonEngine.forgeHarpoon("angler_02", "REINFORCED_BONE_HARPOON", 100000); // Power 25

        const failRes = AncientRunicFishingOceanicHarpoonEngine.castHarpoon(
            tool,
            "CELESTIAL_ASTRAL_WHIRLPOOL" // Requires Power 100
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient angling power");
        expect(tool.currentDurability).toBe(75);
    });

    it("handles line snap failure roll consuming durability", () => {
        const tool = AncientRunicFishingOceanicHarpoonEngine.forgeHarpoon("angler_03", "REINFORCED_BONE_HARPOON", 100000); // 85% success

        const snap = AncientRunicFishingOceanicHarpoonEngine.castHarpoon(
            tool,
            "COASTAL_REEF_SHALLOWS",
            0.95
        );

        expect(snap.success).toBe(false);
        expect(snap.reason).toContain("Catch escaped");
        expect(tool.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in repairHarpoon based on DURABILITY_COST_PER_CAST threshold", () => {
        const tool = AncientRunicFishingOceanicHarpoonEngine.forgeHarpoon("angler_04", "REINFORCED_BONE_HARPOON", 100000);
        tool.currentDurability = 0;
        tool.isFunctional = false;

        // Repair 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicFishingOceanicHarpoonEngine.repairHarpoon(tool, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Repair 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicFishingOceanicHarpoonEngine.repairHarpoon(tool, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported harpoon models", () => {
        expect(() => AncientRunicFishingOceanicHarpoonEngine.forgeHarpoon("a", "BAMBOO_STICK" as any)).toThrow(
            "Unsupported harpoon tool type"
        );

        const invalidTool: ActiveHarpoonTool = {
            toolId: "bad",
            anglerPlayerId: "p",
            toolType: "STICK" as any,
            currentDurability: 50,
            maxDurability: 50,
            anglingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicFishingOceanicHarpoonEngine.castHarpoon(invalidTool, "COASTAL_REEF_SHALLOWS").success).toBe(false);
        expect(AncientRunicFishingOceanicHarpoonEngine.castHarpoon(null as any, "COASTAL_REEF_SHALLOWS").success).toBe(false);
        expect(AncientRunicFishingOceanicHarpoonEngine.repairHarpoon(null as any).success).toBe(false);
    });
});