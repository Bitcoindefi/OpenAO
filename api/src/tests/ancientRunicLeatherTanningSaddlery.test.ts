import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherTanningSaddleryEngine,
    ActiveTanningVat,
} from "../lib/ancientRunicLeatherTanningSaddlery.js";

describe("AncientRunicLeatherTanningSaddleryEngine Saddlery & Barding Synthesis", () => {
    it("crafts Celestial Vanguard Harness in Void Tanning Basin achieving 100% suppleness and returns spliced hides", () => {
        const vat = AncientRunicLeatherTanningSaddleryEngine.constructVat("leatherworker_01", "CELESTIAL_VOID_TANNING_BASIN", 100000);
        expect(vat.vatType).toBe("CELESTIAL_VOID_TANNING_BASIN");
        expect(vat.currentDurability).toBe(320);

        const initialHides = [
            "ASTRAL_BEHEMOTH_LEATHER",
            "ASTRAL_BEHEMOTH_LEATHER",
            "ASTRAL_BEHEMOTH_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherTanningSaddleryEngine.craftSaddlery(
            vat,
            "CELESTIAL_VANGUARD_HARNESS",
            initialHides,
            0.1, // Success roll
            1.0, // Supple roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.saddlery?.recipeType).toBe("CELESTIAL_VANGUARD_HARNESS");
        expect(craftRes.saddlery?.leatherSupplenessPercent).toBe(100);
        expect(craftRes.saddlery?.finalMountSpeedBonusPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.saddlery?.finalMountStaminaBonus).toBe(720); // 600 * 1.20 = 720
        expect(craftRes.saddlery?.consumedHideCount).toBe(2);
        expect(craftRes.saddlery?.consumedHideType).toBe("ASTRAL_BEHEMOTH_LEATHER");
        expect(craftRes.saddlery?.remainingProvidedHides.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(310); // 320 - 10
    });

    it("rejects crafting when insufficient hides are provided", () => {
        const vat = AncientRunicLeatherTanningSaddleryEngine.constructVat("leatherworker_02", "NOVICE_WOOD_TANNING_VAT", 100000);

        const failRes = AncientRunicLeatherTanningSaddleryEngine.craftSaddlery(
            vat,
            "DRAKE_SCALE_WAR_BARDING",
            ["ARMORED_BASILISK_SCALE_HIDE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient hides");
        expect(vat.currentDurability).toBe(80);
    });

    it("handles hide spoilage failure roll consuming durability", () => {
        const vat = AncientRunicLeatherTanningSaddleryEngine.constructVat("leatherworker_03", "NOVICE_WOOD_TANNING_VAT", 100000); // 85% success

        const spoil = AncientRunicLeatherTanningSaddleryEngine.craftSaddlery(
            vat,
            "REINFORCED_CAVALRY_SADDLE",
            ["SUPPLE_DEER_HIDE", "SUPPLE_DEER_HIDE"],
            0.95
        );

        expect(spoil.success).toBe(false);
        expect(spoil.reason).toContain("Leather spoiled");
        expect(vat.currentDurability).toBe(70); // 80 - 10
    });

    it("gates isFunctional in maintainVat based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const vat = AncientRunicLeatherTanningSaddleryEngine.constructVat("leatherworker_04", "NOVICE_WOOD_TANNING_VAT", 100000);
        vat.currentDurability = 0;
        vat.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherTanningSaddleryEngine.maintainVat(vat, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherTanningSaddleryEngine.maintainVat(vat, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported vat models", () => {
        expect(() => AncientRunicLeatherTanningSaddleryEngine.constructVat("l", "PLASTIC_BUCKET" as any)).toThrow(
            "Unsupported tanning vat type"
        );

        const invalidVat: ActiveTanningVat = {
            vatId: "bad",
            leatherworkerPlayerId: "p",
            vatType: "BUCKET" as any,
            currentDurability: 50,
            maxDurability: 50,
            tanningPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherTanningSaddleryEngine.craftSaddlery(invalidVat, "REINFORCED_CAVALRY_SADDLE", ["SUPPLE_DEER_HIDE", "SUPPLE_DEER_HIDE"]).success).toBe(false);
        expect(AncientRunicLeatherTanningSaddleryEngine.craftSaddlery(null as any, "REINFORCED_CAVALRY_SADDLE", []).success).toBe(false);
        expect(AncientRunicLeatherTanningSaddleryEngine.maintainVat(null as any).success).toBe(false);
    });
});