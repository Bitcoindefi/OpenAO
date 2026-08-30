import { describe, it, expect } from "vitest";
import {
    AncientRunicCookingFeastEngine,
    ActiveCookingStation,
} from "../lib/ancientRunicCookingFeast.js";

describe("AncientRunicCookingFeastEngine Culinary Feasts & Hearth Buffs", () => {
    it("cooks Kraken Chowder Feast in Celestial Void Spigot yielding 100% flavor quality and tracks ingredients", () => {
        const spigot = AncientRunicCookingFeastEngine.igniteCookingStation("chef_01", "CELESTIAL_VOID_SPIGOT", 100000);
        expect(spigot.stationType).toBe("CELESTIAL_VOID_SPIGOT");
        expect(spigot.currentDurability).toBe(280);

        const feastRes = AncientRunicCookingFeastEngine.cookFeast(
            spigot,
            "KRAKEN_CHOWDER_FEAST",
            ["KRAKEN_TENTACLE", "KRAKEN_TENTACLE"],
            0.5,
            100000
        );

        expect(feastRes.success).toBe(true);
        expect(feastRes.preparedFeast?.recipeType).toBe("KRAKEN_CHOWDER_FEAST");
        expect(feastRes.preparedFeast?.culinaryQualityPercent).toBe(100); // 50 + 15 + 35 = 100
        expect(feastRes.preparedFeast?.finalBuffValue).toBe(96); // 80 * 1.20 = 96 Magic Damage
        expect(feastRes.preparedFeast?.finalDurationSeconds).toBe(4320); // 3600 * 1.20 = 4320s
        expect(feastRes.preparedFeast?.consumedIngredientCount).toBe(2);
        expect(feastRes.preparedFeast?.consumedIngredientType).toBe("KRAKEN_TENTACLE");
        expect(feastRes.remainingDurability).toBe(270); // 280 - 10
    });

    it("rejects cooking when insufficient raw ingredients are provided", () => {
        const hearth = AncientRunicCookingFeastEngine.igniteCookingStation("chef_02", "CAMPFIRE_HEARTH", 100000);

        // Truffle Stew requires 2x ASTRAL_TRUFFLE. Only provided 1
        const failRes = AncientRunicCookingFeastEngine.cookFeast(
            hearth,
            "TRUFFLE_INFUSED_STEW",
            ["ASTRAL_TRUFFLE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient ingredients");
        expect(hearth.currentDurability).toBe(60);
    });

    it("handles burnt cooking failure roll consuming durability", () => {
        const hearth = AncientRunicCookingFeastEngine.igniteCookingStation("chef_03", "CAMPFIRE_HEARTH", 100000); // 85% success

        // Roll 0.95 (95 > 85%) -> Burnt
        const burnt = AncientRunicCookingFeastEngine.cookFeast(
            hearth,
            "BRAISED_BOAR_RIBS",
            ["BOAR_SHANK", "BOAR_SHANK"],
            0.95
        );

        expect(burnt.success).toBe(false);
        expect(burnt.reason).toContain("burnt to ashes");
        expect(hearth.currentDurability).toBe(50); // 60 - 10
    });

    it("maintains station durability and relights extinguished hearth", () => {
        const hearth = AncientRunicCookingFeastEngine.igniteCookingStation("chef_04", "CAMPFIRE_HEARTH", 100000);
        hearth.currentDurability = 0;
        hearth.isLit = false;

        const rep = AncientRunicCookingFeastEngine.maintainStation(hearth, 40);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(40);
        expect(rep.isLit).toBe(true);
    });

    it("guards against null inputs and unsupported cooking station models", () => {
        expect(() => AncientRunicCookingFeastEngine.igniteCookingStation("c", "MICROWAVE" as any)).toThrow(
            "Unsupported cooking station type"
        );

        expect(AncientRunicCookingFeastEngine.cookFeast(null as any, "BRAISED_BOAR_RIBS", []).success).toBe(false);
        expect(AncientRunicCookingFeastEngine.maintainStation(null as any).success).toBe(false);
    });
});