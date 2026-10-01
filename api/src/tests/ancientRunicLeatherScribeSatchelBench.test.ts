import { describe, it, expect } from "vitest";
import { AncientRunicLeatherScribeSatchelBenchEngine } from "../lib/ancientRunicLeatherScribeSatchelBench";
import type { ActiveSatchelBench } from "../lib/ancientRunicLeatherScribeSatchelBench";

describe("AncientRunicLeatherScribeSatchelBenchEngine Satchel Benches & Scroll Satchels", () => {
    it("crafts Celestial Void Seraphic Bottomless Grimoire Haversack in Archivist Sanctum achieving 100% fluidity and returns spliced leathers", () => {
        const bench = AncientRunicLeatherScribeSatchelBenchEngine.constructBench("leather_01", "CELESTIAL_VOID_SERAPHIC_ARCHIVIST_SANCTUM");
        expect(bench.benchType).toBe("CELESTIAL_VOID_SERAPHIC_ARCHIVIST_SANCTUM");
        expect(bench.currentDurability).toBe(310);

        const initialLeathers = [
            "CELESTIAL_VOID_STARLIGHT_ARCHIVIST_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ARCHIVIST_LEATHER",
            "CELESTIAL_VOID_STARLIGHT_ARCHIVIST_LEATHER"
        ] as any[];

        const craftRes = AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(
            bench,
            "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_GRIMOIRE_HAVERSACK",
            initialLeathers,
            0.1, // Success roll
            1.0, // Fluidity roll 1.0 -> 40 + 40 + 20 = 100%
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.satchel?.recipeType).toBe("CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_GRIMOIRE_HAVERSACK");
        expect(craftRes.satchel?.retrievalFluidityPercent).toBe(100);
        expect(craftRes.satchel?.finalScrollManaCostReductionPercent).toBe(96); // 80 * 1.20 = 96%
        expect(craftRes.satchel?.finalScrollDamageMitigationPercent).toBe(72); // 60 * 1.20 = 72%
        expect(craftRes.satchel?.consumedLeatherCount).toBe(2);
        expect(craftRes.satchel?.consumedLeatherType).toBe("CELESTIAL_VOID_STARLIGHT_ARCHIVIST_LEATHER");
        expect(craftRes.satchel?.remainingProvidedLeathers.length).toBe(1);
        expect(craftRes.remainingDurability).toBe(300); // 310 - 10
    });

    it("verifies mid-range fluidity roll and sub-100% quality scaling on Oak satchel bench", () => {
        const bench = AncientRunicLeatherScribeSatchelBenchEngine.constructBench("leather_mid", "OAK_SCRIBE_SATCHEL_BENCH");
        // powerRatio = 25/120 = 0.20833, bonusPoints = (10/35)*20 = 5.714
        // safeFluidityRoll = 0.5 -> 0.5 * 40 = 20
        // fluidityScore = Math.round(20 + 8.333 + 5.714) = 34
        // qualityMultiplier = 0.8 + (34/100)*0.4 = 0.8 + 0.136 = 0.936
        // finalManaReduction = Math.round(20 * 0.936) = 19
        // finalDamageMitigate = Math.round(10 * 0.936) = 9
        const craftRes = AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(
            bench,
            "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH",
            ["TANNED_CALFSKIN_SATCHEL_BLANK", "TANNED_CALFSKIN_SATCHEL_BLANK"],
            0.1,
            0.5
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.satchel?.retrievalFluidityPercent).toBe(34);
        expect(craftRes.satchel?.finalScrollManaCostReductionPercent).toBe(19);
        expect(craftRes.satchel?.finalScrollDamageMitigationPercent).toBe(9);
    });

    it("handles bench becoming non-functional after successful craft when durability falls below threshold", () => {
        const bench = AncientRunicLeatherScribeSatchelBenchEngine.constructBench("leather_wear", "OAK_SCRIBE_SATCHEL_BENCH");
        bench.currentDurability = 15;
        expect(bench.isFunctional).toBe(true);

        // First craft succeeds: 15 - 10 = 5 (< 10), so isFunctional flips to false in updatedBench
        const res1 = AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(
            bench,
            "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH",
            ["TANNED_CALFSKIN_SATCHEL_BLANK", "TANNED_CALFSKIN_SATCHEL_BLANK"],
            0.1
        );
        expect(res1.success).toBe(true);
        expect(res1.remainingDurability).toBe(5);
        expect(res1.updatedBench?.isFunctional).toBe(false);

        // Subsequent craft on updated bench is rejected and returns fallback array
        const res2 = AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(
            res1.updatedBench!,
            "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH",
            ["TANNED_CALFSKIN_SATCHEL_BLANK", "TANNED_CALFSKIN_SATCHEL_BLANK"]
        );
        expect(res2.success).toBe(false);
        expect(res2.reason).toContain("warped or lacks durability");
        expect(res2.remainingProvidedLeathers.length).toBe(2);
    });

    it("rejects crafting when insufficient leather is provided and returns provided leathers", () => {
        const bench = AncientRunicLeatherScribeSatchelBenchEngine.constructBench("leather_02", "OAK_SCRIBE_SATCHEL_BENCH");

        const failRes = AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(
            bench,
            "SCHOLAR_MULTI_TIER_DOCUMENT_SATCHEL",
            ["ENCHANTED_WATERPROOF_WAX_CAKE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient satchel leather/wax");
        expect(failRes.remainingProvidedLeathers.length).toBe(1);
        expect(bench.currentDurability).toBe(75);
    });

    it("handles pouch scorched failure roll consuming durability and leathers", () => {
        const bench = AncientRunicLeatherScribeSatchelBenchEngine.constructBench("leather_03", "OAK_SCRIBE_SATCHEL_BENCH"); // 85% success

        const fail = AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(
            bench,
            "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH",
            ["TANNED_CALFSKIN_SATCHEL_BLANK", "TANNED_CALFSKIN_SATCHEL_BLANK", "TANNED_CALFSKIN_SATCHEL_BLANK"],
            0.95
        );

        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("scorched");
        expect(fail.remainingProvidedLeathers?.length).toBe(1); // 3 - 2 = 1 remaining
        expect(fail.remainingDurability).toBe(65); // 75 - 10
    });

    it("gates isFunctional in maintainBench based on DURABILITY_COST_PER_CRAFT threshold and returns clone", () => {
        const bench = AncientRunicLeatherScribeSatchelBenchEngine.constructBench("leather_04", "OAK_SCRIBE_SATCHEL_BENCH");
        bench.currentDurability = 0;
        bench.isFunctional = false;

        // Maintain 5 (below 10 required) -> isFunctional remains false
        const repLow = AncientRunicLeatherScribeSatchelBenchEngine.maintainBench(bench, 5);
        expect(repLow.success).toBe(true);
        expect(repLow.newDurability).toBe(5);
        expect(repLow.isFunctional).toBe(false);
        expect(bench.currentDurability).toBe(0); // input unchanged

        // Maintain 10 more on clone -> 15 (>= 10) -> isFunctional becomes true
        const repHigh = AncientRunicLeatherScribeSatchelBenchEngine.maintainBench(repLow.updatedBench!, 10);
        expect(repHigh.success).toBe(true);
        expect(repHigh.newDurability).toBe(15);
        expect(repHigh.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported bench models", () => {
        expect(() => AncientRunicLeatherScribeSatchelBenchEngine.constructBench("l", "PLASTIC_BENCH" as any)).toThrow(
            "Unsupported satchel bench type"
        );

        const invalidBench: ActiveSatchelBench = {
            benchId: "bad",
            leatherworkerPlayerId: "p",
            benchType: "BENCH" as any,
            currentDurability: 50,
            maxDurability: 50,
            isFunctional: true,
        };

        expect(AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(invalidBench, "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH", ["TANNED_CALFSKIN_SATCHEL_BLANK", "TANNED_CALFSKIN_SATCHEL_BLANK"]).success).toBe(false);
        expect(AncientRunicLeatherScribeSatchelBenchEngine.craftSatchel(null as any, "APPRENTICE_MOISTURE_PROOF_SCROLL_POUCH", []).success).toBe(false);
        expect(AncientRunicLeatherScribeSatchelBenchEngine.maintainBench(null as any).success).toBe(false);
    });
});