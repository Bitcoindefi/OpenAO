import { describe, it, expect } from "vitest";
import {
    AncientRunicInscribingSpellbookTomeEngine,
    ActiveAstralQuill,
} from "../lib/ancientRunicInscribingSpellbookTome.js";

describe("AncientRunicInscribingSpellbookTomeEngine Spellbook Synthesis & Inscribing", () => {
    it("inscribes Codex of Dimensional Rupture with Void Dragon Quill achieving 100% calligraphy quality and tracks consumed parchments", () => {
        const quill = AncientRunicInscribingSpellbookTomeEngine.forgeAstralQuill("scribe_01", "VOID_DRAGON_QUILL", 100000);
        expect(quill.quillType).toBe("VOID_DRAGON_QUILL");
        expect(quill.currentInkDurability).toBe(300);

        const inscribeRes = AncientRunicInscribingSpellbookTomeEngine.inscribeTome(
            quill,
            "CODEX_OF_DIMENSIONAL_RUPTURE",
            ["VOID_ASTRAL_PARCHMENT", "VOID_ASTRAL_PARCHMENT"],
            0.5,
            100000
        );

        expect(inscribeRes.success).toBe(true);
        expect(inscribeRes.inscribedTome?.recipeType).toBe("CODEX_OF_DIMENSIONAL_RUPTURE");
        expect(inscribeRes.inscribedTome?.calligraphyQualityPercent).toBe(100); // 50 + 15 + 35 = 100
        expect(inscribeRes.inscribedTome?.finalSpellPower).toBe(132); // 110 * 1.20 = 132
        expect(inscribeRes.inscribedTome?.finalManaCostReductionPercent).toBe(42); // 35 * 1.20 = 42%
        expect(inscribeRes.inscribedTome?.consumedParchmentCount).toBe(2);
        expect(inscribeRes.inscribedTome?.consumedParchmentType).toBe("VOID_ASTRAL_PARCHMENT");
        expect(inscribeRes.remainingInkDurability).toBe(288); // 300 - 12
    });

    it("scales intermediate calligraphy quality and stats when using lower tier quill and roll", () => {
        const ravenQuill = AncientRunicInscribingSpellbookTomeEngine.forgeAstralQuill("scribe_mid", "RAVEN_FEATHER_QUILL", 100000); // +10% bonus

        // Roll 0.0 -> Quality = 50 + 0 + 10 = 60%. Multiplier = 0.8 + 0.24 = 1.04x
        const midRes = AncientRunicInscribingSpellbookTomeEngine.inscribeTome(
            ravenQuill,
            "TOME_OF_ARCANE_MISSILES",
            ["PAPYRUS_OF_SWIFTNESS", "PAPYRUS_OF_SWIFTNESS"],
            0.0
        );

        expect(midRes.success).toBe(true);
        expect(midRes.inscribedTome?.calligraphyQualityPercent).toBe(60);
        expect(midRes.inscribedTome?.finalSpellPower).toBe(36); // 35 * 1.04 = 36.4 -> 36
        expect(midRes.inscribedTome?.finalManaCostReductionPercent).toBe(10); // 10 * 1.04 = 10.4 -> 10
    });

    it("rejects inscribing when insufficient parchments are provided", () => {
        const quill = AncientRunicInscribingSpellbookTomeEngine.forgeAstralQuill("scribe_02", "RAVEN_FEATHER_QUILL", 100000);

        const failRes = AncientRunicInscribingSpellbookTomeEngine.inscribeTome(
            quill,
            "GRIMOIRE_OF_CATACLYSMIC_INFERNO",
            ["VELLUM_OF_PYROMANCY"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient parchments");
        expect(quill.currentInkDurability).toBe(100);
    });

    it("handles botch roll consuming ink durability", () => {
        const quill = AncientRunicInscribingSpellbookTomeEngine.forgeAstralQuill("scribe_03", "RAVEN_FEATHER_QUILL", 100000);

        const botch = AncientRunicInscribingSpellbookTomeEngine.inscribeTome(
            quill,
            "TOME_OF_ARCANE_MISSILES",
            ["PAPYRUS_OF_SWIFTNESS", "PAPYRUS_OF_SWIFTNESS"],
            0.95
        );

        expect(botch.success).toBe(false);
        expect(botch.reason).toContain("botched");
        expect(quill.currentInkDurability).toBe(88);
    });

    it("refills ink well and restores writing capability", () => {
        const quill = AncientRunicInscribingSpellbookTomeEngine.forgeAstralQuill("scribe_04", "RAVEN_FEATHER_QUILL", 100000);
        quill.currentInkDurability = 0;
        quill.hasInk = false;

        const ref = AncientRunicInscribingSpellbookTomeEngine.refillInk(quill, 60);
        expect(ref.success).toBe(true);
        expect(ref.newInkDurability).toBe(60);
        expect(ref.hasInk).toBe(true);
    });

    it("guards against null inputs and unsupported quill models", () => {
        expect(() => AncientRunicInscribingSpellbookTomeEngine.forgeAstralQuill("s", "PENCIL" as any)).toThrow(
            "Unsupported astral quill type"
        );

        expect(AncientRunicInscribingSpellbookTomeEngine.inscribeTome(null as any, "TOME_OF_ARCANE_MISSILES", []).success).toBe(false);
        expect(AncientRunicInscribingSpellbookTomeEngine.refillInk(null as any).success).toBe(false);
    });
});