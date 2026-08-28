import { describe, it, expect } from "vitest";
import {
    EnchantmentDisenchantForgeEngine,
    DisenchantableItem,
} from "../lib/enchantmentDisenchantForge.js";

describe("EnchantmentDisenchantForgeEngine Power, Skill Scaling & Total Valuation", () => {
    it("disenchants RARE item with enchantment power scaling and calculates total dust equivalent", () => {
        const rareSword: DisenchantableItem = {
            itemId: "item_sword_99",
            itemTemplateId: "glowing_broadsword",
            rarity: "RARE",
            enchantmentPower: 3, // +30% power
        };

        // Skill 100 -> skill factor 1.50, power 1.30 -> 15 * 1.30 * 1.50 = 29 Arcane Dust + 1 Greater Essence (15 dust eq) = 44 total
        const result = EnchantmentDisenchantForgeEngine.disenchantItem(rareSword, 100, () => 0.99);
        expect(result.success).toBe(true);
        expect(result.wasCriticalExtraction).toBe(false);

        const dust = result.yields.find((y) => y.essence === "ARCANE_DUST");
        expect(dust?.quantity).toBe(29);
        expect(result.totalArcaneDust).toBe(29);
        expect(result.totalDustEquivalent).toBe(44); // 29 + 15
    });

    it("guards safely against NaN player skill", () => {
        const item: DisenchantableItem = {
            itemId: "item_1",
            itemTemplateId: "iron_dagger",
            rarity: "COMMON",
        };

        const result = EnchantmentDisenchantForgeEngine.disenchantItem(item, NaN as any);
        expect(result.success).toBe(true);
        expect(Number.isFinite(result.totalArcaneDust)).toBe(true);
        expect(result.totalArcaneDust).toBe(2);
    });
});