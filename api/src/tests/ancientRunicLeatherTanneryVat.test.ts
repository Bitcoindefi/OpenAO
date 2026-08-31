import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherTanneryVatEngine,
    ActiveSteepingVat,
} from "../lib/ancientRunicLeatherTanneryVat.js";

describe("AncientRunicLeatherTanneryVatEngine Steeping Vats & Treated Leathers", () => {
    it("steeps Celestial Void Acid-Proof Hide in Acid Sanctum achieving 100% chemical bond and returns spliced tannins", () => {
        const vat = AncientRunicLeatherTanneryVatEngine.constructVat("tanner_01", "CELESTIAL_VOID_ACID_VAT_SANCTUM");
        expect(vat.vatType).toBe("CELESTIAL_VOID_ACID_VAT_SANCTUM");
        expect(vat.currentDurability).toBe(310);

        const initialTannins = [
            "CELESTIAL_VOID_ALCHEMICAL_ACID",
            "CELESTIAL_VOID_ALCHEMICAL_ACID",
            "CELESTIAL_VOID_ALCHEMICAL_ACID"
        ] as any[];

        const craftRes = AncientRunicLeatherTanneryVatEngine.steepLeather(
            vat,
            "CELESTIAL_VOID_ACID_PROOF_HIDE",
            initialTannins,
            0.1, // Success roll
            1.0, // Bond roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.leather?.recipeType).toBe("CELESTIAL_VOID_ACID_PROOF_HIDE");
        expect(craftRes.leather?.chemicalBondRatingPercent).toBe(100);
        expect(craftRes.leather?.finalCorrosionResistancePercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.leather?.finalMagicBarrierPercent).toBe(66); // 55 * 1.20 = 66%
        expect(craftRes.leather?.consumedTanninCount).toBe(2);
        expect(craftRes.leather?.consumedTanninType).toBe("CELESTIAL_VOID_ALCHEMICAL_ACID");
        expect(craftRes.leather?.remainingProvidedTannins.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("handles vat becoming non-functional after successful craft when durability falls below threshold", () => {
        const vat = AncientRunicLeatherTanneryVatEngine.constructVat("tanner_wear", "OAK_BARK_STEEPING_VAT");
        vat.currentDurability = 15;
        expect(vat.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false
        const res1 = AncientRunicLeatherTanneryVatEngine.steepLeather(
            vat,
            "WATERPROOF_STALKER_LEATHER",
            ["HEMLOCK_TANNIN_BARK", "HEMLOCK_TANNIN_BARK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(vat.isFunctional).toBe(false);

        // Subsequent craft is rejected
        const res2 = AncientRunicLeatherTanneryVatEngine.steepLeather(
            vat,
            "WATERPROOF_STALKER_LEATHER",
            ["HEMLOCK_TANNIN_BARK", "HEMLOCK_TANNIN_BARK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("corroded or lacks durability");
    });

    it("rejects crafting when insufficient tannin/mordant is provided", () => {
        const vat = AncientRunicLeatherTanneryVatEngine.constructVat("tanner_02", "OAK_BARK_STEEPING_VAT");

        const failRes = AncientRunicLeatherTanneryVatEngine.steepLeather(
            vat,
            "VITRIOL_HARDENED_CUIRASS_LEATHER",
            ["VITRIOL_MORDANT_SOLUTION"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient tannin");
        expect(vat.currentDurability).toBe(75);
    });

    it("handles acid bath over-fermented failure roll consuming durability and tannins", () => {
        const vat = AncientRunicLeatherTanneryVatEngine.constructVat("tanner_03", "OAK_BARK_STEEPING_VAT"); // 85% success

        const fail = AncientRunicLeatherTanneryVatEngine.steepLeather(
            vat,
            "WATERPROOF_STALKER_LEATHER",
            ["HEMLOCK_TANNIN_BARK", "HEMLOCK_TANNIN_BARK", "HEMLOCK_TANNIN_BARK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("over-fermented");
        expect(fail.remainingProvidedTannins?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(vat.currentDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainVat based on DURABILITY_COST_PER_CRAFT threshold", () => {
        const vat = AncientRunicLeatherTanneryVatEngine.constructVat("tanner_04", "OAK_BARK_STEEPING_VAT");
        vat.currentDurability = 0;
        vat.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherTanneryVatEngine.maintainVat(vat, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);

        // Maintain 10 more -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherTanneryVatEngine.maintainVat(vat, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported vat models", () => {
        expect(() => AncientRunicLeatherTanneryVatEngine.constructVat("t", "PLASTIC_TUB" as any)).toThrow(
            "Unsupported steeping vat type"
        );

        const invalidVat: ActiveSteepingVat = {
            vatId: "bad",
            tannerPlayerId: "p",
            vatType: "TUB" as any,
            currentDurability: 50,
            maxDurability: 50,
            steepingPower: 10,
            isFunctional: true,
        };

        expect(AncientRunicLeatherTanneryVatEngine.steepLeather(invalidVat, "WATERPROOF_STALKER_LEATHER", ["HEMLOCK_TANNIN_BARK", "HEMLOCK_TANNIN_BARK"]).success).toBe(false);
        expect(AncientRunicLeatherTanneryVatEngine.steepLeather(null as any, "WATERPROOF_STALKER_LEATHER", []).success).toBe(false);
        expect(AncientRunicLeatherTanneryVatEngine.maintainVat(null as any).success).toBe(false);
    });
});