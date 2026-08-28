import { describe, it, expect } from "vitest";
import { LuckLootEngine, LootTableEntry } from "../lib/luckLootEngine.js";

describe("LuckLootEngine Loot Distribution and Weight Skewing", () => {
    const mockLootTable: LootTableEntry[] = [
        { itemId: "junk_bone", rarity: "COMMON", baseWeight: 1000 },
        { itemId: "iron_sword", rarity: "UNCOMMON", baseWeight: 250 },
        { itemId: "sapphire_gem", rarity: "RARE", baseWeight: 50 },
        { itemId: "dragon_scale", rarity: "EPIC", baseWeight: 10 },
        { itemId: "excalibur", rarity: "LEGENDARY", baseWeight: 1 },
    ];

    it("suppresses COMMON weights and boosts LEGENDARY weights with high luck", () => {
        const skewed = LuckLootEngine.calculateSkewedWeights(mockLootTable, 100);

        const commonEntry = skewed.find(s => s.item.rarity === "COMMON")!;
        const epicEntry = skewed.find(s => s.item.rarity === "EPIC")!;
        const legEntry = skewed.find(s => s.item.rarity === "LEGENDARY")!;

        // Base common 1000 -> At 100 luck, mod is 0.50 -> 500
        expect(commonEntry.skewedWeight).toBe(500);

        // Base epic 10 -> At 100 luck, mod is 1.0 + 1.5 = 2.50 -> 25
        expect(epicEntry.skewedWeight).toBe(25);

        // Base legendary 1 -> At 100 luck, mod is 1.0 + 4.0 = 5.0 -> 5
        expect(legEntry.skewedWeight).toBe(5);
    });

    it("rolls an item using the weighted distribution", () => {
        const commonDrop = LuckLootEngine.rollLootDrop(mockLootTable, 0, () => 0.01);
        expect(commonDrop?.rarity).toBe("COMMON");

        const legendaryDrop = LuckLootEngine.rollLootDrop(mockLootTable, 0, () => 0.9999);
        expect(legendaryDrop?.rarity).toBe("LEGENDARY");
    });
});