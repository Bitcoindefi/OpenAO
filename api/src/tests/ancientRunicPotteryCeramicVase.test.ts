import { describe, it, expect } from "vitest";
import {
    AncientRunicPotteryCeramicVaseEngine,
    ActivePotterWheel,
} from "../lib/ancientRunicPotteryCeramicVase.js";

describe("AncientRunicPotteryCeramicVaseEngine Ceramic Urns & Amphoras", () => {
    it("crafts Celestial Void Essence Reservoir in Void Kiln achieving 100% vitrification and returns spliced clays", () => {
        const wheel = AncientRunicPotteryCeramicVaseEngine.constructWheel("potter_01", "CELESTIAL_VOID_KILN_SANCTUM");
        expect(wheel.wheelType).toBe("CELESTIAL_VOID_KILN_SANCTUM");
        expect(wheel.currentDurability).toBe(310);

        const initialClays = [
            "CELESTIAL_VOID_CERAMIC_PASTE",
            "CELESTIAL_VOID_CERAMIC_PASTE",
            "CELESTIAL_VOID_CERAMIC_PASTE"
        ] as any[];

        const craftRes = AncientRunicPotteryCeramicVaseEngine.craftVessel(
            wheel,
            "CELESTIAL_VOID_ESSENCE_RESERVOIR",
            initialClays,
            0.1, // Success roll
            1.0, // Vitrification roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.vessel?.recipeType).toBe("CELESTIAL_VOID_ESSENCE_RESERVOIR");
        expect(craftRes.vessel?.vitrificationPercent).toBe(100);
        expect(craftRes.vessel?.finalPreservationDurationSec).toBe(864); // 720 * 1.20 = 864s
        expect(craftRes.vessel?.finalDecayMitigationPercent).toBe(90); // 75 * 1.20 = 90%
        expect(craftRes.vessel?.consumedClayCount).toBe(2);
        expect(craftRes.vessel?.consumedClayType).toBe("CELESTIAL_VOID_CERAMIC_PASTE");
        expect(craftRes.vessel?.remainingProvidedClays.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles wheel becoming non-functional after successful craft when durability falls below threshold", () => {
        const wheel = AncientRunicPotteryCeramicVaseEngine.constructWheel("potter_wear", "CLAY_POTTER_KICKWHEEL");
        wheel.currentDurability = 15;
        expect(wheel.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicPotteryCeramicVaseEngine.craftVessel(
            wheel,
            "APOTHECARY_HERB_URN",
            ["TERRACOTTA_RIVER_CLAY", "TERRACOTTA_RIVER_CLAY"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(wheel.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicPotteryCeramicVaseEngine.craftVessel(
            wheel,
            "APOTHECARY_HERB_URN",
            ["TERRACOTTA_RIVER_CLAY", "TERRACOTTA_RIVER_CLAY"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("uncalibrated or lacks durability");
    });

    it("rejects crafting when insufficient clay is provided", () => {
        const wheel = AncientRunicPotteryCeramicVaseEngine.constructWheel("potter_02", "CLAY_POTTER_KICKWHEEL");

        const failRes = AncientRunicPotteryCeramicVaseEngine.craftVessel(
            wheel,
            "ENCHANTED_ELIXIR_AMPHORA",
            ["GLAZED_ARCANE_KAOLIN"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient clay");
        expect(wheel.currentDurability).toBe(75);
    });

    it("handles clay slump collapse failure roll consuming durability and clays", () => {
        const wheel = AncientRunicPotteryCeramicVaseEngine.constructWheel("potter_03", "CLAY_POTTER_KICKWHEEL"); // 85% success

        const fail = AncientRunicPotteryCeramicVaseEngine.craftVessel(
            wheel,
            "APOTHECARY_HERB_URN",
            ["TERRACOTTA_RIVER_CLAY", "TERRACOTTA_RIVER_CLAY", "TERRACOTTA_RIVER_CLAY"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("slumped");
        expect(fail.remainingProvidedClays?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(wheel.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainWheel based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const wheel = AncientRunicPotteryCeramicVaseEngine.constructWheel("potter_04", "CLAY_POTTER_KICKWHEEL");
        wheel.currentDurability = 0;
        wheel.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicPotteryCeramicVaseEngine.maintainWheel(wheel, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicPotteryCeramicVaseEngine.maintainWheel(wheel, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported wheel models", () => {
        expect(() => AncientRunicPotteryCeramicVaseEngine.constructWheel("p", "PLASTIC_WHEEL" as any)).toThrow(
            "Unsupported potter wheel type"
        );

        const invalidWheel: ActivePotterWheel = {
            wheelId: "bad",
            potterPlayerId: "p",
            wheelType: "WHEEL" as any,
            currentDurability: 50,
            maxDurability: 50,
            potteryPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicPotteryCeramicVaseEngine.craftVessel(invalidWheel, "APOTHECARY_HERB_URN", ["TERRACOTTA_RIVER_CLAY", "TERRACOTTA_RIVER_CLAY"]).success).toBe(false);
        expect(AncientRunicPotteryCeramicVaseEngine.craftVessel(null as any, "APOTHECARY_HERB_URN", []).success).toBe(false);
        expect(AncientRunicPotteryCeramicVaseEngine.maintainWheel(null as any).success).toBe(false);
    });
});