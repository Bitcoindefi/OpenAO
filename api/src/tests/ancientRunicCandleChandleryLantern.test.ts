import { describe, it, expect } from "vitest";
import {
    AncientRunicCandleChandleryLanternEngine,
    ActiveChandlerWorkbench,
} from "../lib/ancientRunicCandleChandleryLantern.js";

describe("AncientRunicCandleChandleryLanternEngine Lanterns & Pharus Beacons", () => {
    it("crafts Celestial Starfire Pharus in Beacon Forge achieving 100% brilliance and returns spliced cores", () => {
        const workbench = AncientRunicCandleChandleryLanternEngine.constructWorkbench("chandler_01", "CELESTIAL_VOID_BEACON_FORGE", 100000);
        expect(workbench.workbenchType).toBe("CELESTIAL_VOID_BEACON_FORGE");
        expect(workbench.currentDurability).toBe(310);

        const initialCores = [
            "CELESTIAL_STARFIRE_CORE",
            "CELESTIAL_STARFIRE_CORE",
            "CELESTIAL_STARFIRE_CORE"
        ] as any[];

        const craftRes = AncientRunicCandleChandleryLanternEngine.craftLantern(
            workbench,
            "CELESTIAL_STARFIRE_PHARUS",
            initialCores,
            0.1, // Success roll
            1.0, // Brilliance roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.lantern?.recipeType).toBe("CELESTIAL_STARFIRE_PHARUS");
        expect(craftRes.lantern?.illuminatingBrilliancePercent).toBe(100);
        expect(craftRes.lantern?.finalSightRadiusMeters).toBe(108); // 90 * 1.20 = 108m
        expect(craftRes.lantern?.finalStealthDetectionPercent).toBe(36); // 30 * 1.20 = 36%
        expect(craftRes.lantern?.consumedCoreCount).toBe(2);
        expect(craftRes.lantern?.consumedCoreType).toBe("CELESTIAL_STARFIRE_CORE");
        expect(craftRes.lantern?.remainingProvidedCores.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles workbench becoming non-functional after successful craft when durability falls below threshold", () => {
        const workbench = AncientRunicCandleChandleryLanternEngine.constructWorkbench("chandler_wear", "PINE_CHANDLER_WORKBENCH", 100000);
        workbench.currentDurability = 15;
        expect(workbench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicCandleChandleryLanternEngine.craftLantern(
            workbench,
            "WANDERER_BRASS_LANTERN",
            ["PURE_BEESWAX_CORE", "PURE_BEESWAX_CORE"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(workbench.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicCandleChandleryLanternEngine.craftLantern(
            workbench,
            "WANDERER_BRASS_LANTERN",
            ["PURE_BEESWAX_CORE", "PURE_BEESWAX_CORE"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("misaligned or lacks durability");
    });

    it("rejects crafting when insufficient wax cores are provided", () => {
        const workbench = AncientRunicCandleChandleryLanternEngine.constructWorkbench("chandler_02", "PINE_CHANDLER_WORKBENCH", 100000);

        const failRes = AncientRunicCandleChandleryLanternEngine.craftLantern(
            workbench,
            "WARDSTONE_PRISMATIC_BEACON",
            ["ASTRAL_GOLDEN_WAX_CORE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient wax cores");
        expect(workbench.currentDurability).toBe(75);
    });

    it("handles lens fracture failure roll consuming durability", () => {
        const workbench = AncientRunicCandleChandleryLanternEngine.constructWorkbench("chandler_03", "PINE_CHANDLER_WORKBENCH", 100000); // 85% success

        const fail = AncientRunicCandleChandleryLanternEngine.craftLantern(
            workbench,
            "WANDERER_BRASS_LANTERN",
            ["PURE_BEESWAX_CORE", "PURE_BEESWAX_CORE"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("fractured");
        expect(workbench.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainWorkbench based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const workbench = AncientRunicCandleChandleryLanternEngine.constructWorkbench("chandler_04", "PINE_CHANDLER_WORKBENCH", 100000);
        workbench.currentDurability = 0;
        workbench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicCandleChandleryLanternEngine.maintainWorkbench(workbench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicCandleChandleryLanternEngine.maintainWorkbench(workbench, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported workbench models", () => {
        expect(() => AncientRunicCandleChandleryLanternEngine.constructWorkbench("c", "PLASTIC_TABLE" as any)).toThrow(
            "Unsupported chandler workbench type"
        );

        const invalidWorkbench: ActiveChandlerWorkbench = {
            workbenchId: "bad",
            chandlerPlayerId: "p",
            workbenchType: "TABLE" as any,
            currentDurability: 50,
            maxDurability: 50,
            chandleryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicCandleChandleryLanternEngine.craftLantern(invalidWorkbench, "WANDERER_BRASS_LANTERN", ["PURE_BEESWAX_CORE", "PURE_BEESWAX_CORE"]).success).toBe(false);
        expect(AncientRunicCandleChandleryLanternEngine.craftLantern(null as any, "WANDERER_BRASS_LANTERN", []).success).toBe(false);
        expect(AncientRunicCandleChandleryLanternEngine.maintainWorkbench(null as any).success).toBe(false);
    });
});