import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherTanneryDryingRackEngine,
    ActiveDryingRack,
} from "../lib/ancientRunicLeatherTanneryDryingRack.js";

describe("AncientRunicLeatherTanneryDryingRackEngine Cured Leathers & Softening Frames", () => {
    it("crafts Celestial Void Softened Fleece on Softening Sanctum achieving 100% suppleness and returns spliced pelts", () => {
        const rack = AncientRunicLeatherTanneryDryingRackEngine.constructRack("tanner_01", "CELESTIAL_VOID_SOFTENING_SANCTUM");
        expect(rack.rackType).toBe("CELESTIAL_VOID_SOFTENING_SANCTUM");
        expect(rack.currentDurability).toBe(310);

        const initialPelts = [
            "CELESTIAL_VOID_STALKER_FUR",
            "CELESTIAL_VOID_STALKER_FUR",
            "CELESTIAL_VOID_STALKER_FUR"
        ] as any[];

        const craftRes = AncientRunicLeatherTanneryDryingRackEngine.craftSuppleLeather(
            rack,
            "CELESTIAL_VOID_SOFTENED_FLEECE",
            initialPelts,
            0.1, // Success roll
            1.0, // Suppleness roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.leather?.recipeType).toBe("CELESTIAL_VOID_SOFTENED_FLEECE");
        expect(craftRes.leather?.supplenessPercent).toBe(100);
        expect(craftRes.leather?.finalDurabilityResistancePercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.leather?.finalElementalWardPercent).toBe(66); // 55 * 1.20 = 66%
        expect(craftRes.leather?.consumedPeltCount).toBe(2);
        expect(craftRes.leather?.consumedPeltType).toBe("CELESTIAL_VOID_STALKER_FUR");
        expect(craftRes.leather?.remainingProvidedPelts.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles rack becoming non-functional after successful craft when durability falls below threshold", () => {
        const rack = AncientRunicLeatherTanneryDryingRackEngine.constructRack("tanner_wear", "HICKORY_DRYING_RACK");
        rack.currentDurability = 15;
        expect(rack.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherTanneryDryingRackEngine.craftSuppleLeather(
            rack,
            "TANNED_RANGER_HIDE",
            ["ROUGH_BOAR_PELT", "ROUGH_BOAR_PELT"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(rack.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicLeatherTanneryDryingRackEngine.craftSuppleLeather(
            rack,
            "TANNED_RANGER_HIDE",
            ["ROUGH_BOAR_PELT", "ROUGH_BOAR_PELT"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
    });

    it("rejects crafting when insufficient pelts are provided", () => {
        const rack = AncientRunicLeatherTanneryDryingRackEngine.constructRack("tanner_02", "HICKORY_DRYING_RACK");

        const failRes = AncientRunicLeatherTanneryDryingRackEngine.craftSuppleLeather(
            rack,
            "WYRMSCALE_REINFORCED_LEATHER",
            ["PRIME_WYVERN_HIDE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient pelts");
        expect(rack.currentDurability).toBe(75);
    });

    it("handles hide scorched failure roll consuming durability and pelts", () => {
        const rack = AncientRunicLeatherTanneryDryingRackEngine.constructRack("tanner_03", "HICKORY_DRYING_RACK"); // 85% success

        const fail = AncientRunicLeatherTanneryDryingRackEngine.craftSuppleLeather(
            rack,
            "TANNED_RANGER_HIDE",
            ["ROUGH_BOAR_PELT", "ROUGH_BOAR_PELT", "ROUGH_BOAR_PELT"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("scorched");
        expect(fail.remainingProvidedPelts?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(rack.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainRack based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const rack = AncientRunicLeatherTanneryDryingRackEngine.constructRack("tanner_04", "HICKORY_DRYING_RACK");
        rack.currentDurability = 0;
        rack.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherTanneryDryingRackEngine.maintainRack(rack, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherTanneryDryingRackEngine.maintainRack(rack, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported rack models", () => {
        expect(() => AncientRunicLeatherTanneryDryingRackEngine.constructRack("t", "PLASTIC_HANGER" as any)).toThrow(
            "Unsupported drying rack type"
        );

        const invalidRack: ActiveDryingRack = {
            rackId: "bad",
            tannerPlayerId: "p",
            rackType: "HANGER" as any,
            currentDurability: 50,
            maxDurability: 50,
            tanningPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherTanneryDryingRackEngine.craftSuppleLeather(invalidRack, "TANNED_RANGER_HIDE", ["ROUGH_BOAR_PELT", "ROUGH_BOAR_PELT"]).success).toBe(false);
        expect(AncientRunicLeatherTanneryDryingRackEngine.craftSuppleLeather(null as any, "TANNED_RANGER_HIDE", []).success).toBe(false);
        expect(AncientRunicLeatherTanneryDryingRackEngine.maintainRack(null as any).success).toBe(false);
    });
});