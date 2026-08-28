/**
 * Dynamic Luck-Based Loot Distribution Engine for OpenAO MMORPG.
 * Mathematically skews drop probability weights based on a character's luck stat,
 * suppressing common drops while amplifying rare, epic, and legendary yields.
 */

export type LootRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface LootTableEntry {
    itemId: string;
    rarity: LootRarity;
    baseWeight: number; // The un-skewed probability weight
}

export class LuckLootEngine {
    /**
     * Calculates the luck modifier multiplier for a specific rarity tier.
     * High luck penalizes Common drops and scales Rare, Epic, and Legendary drops.
     */
    public static getRarityWeightModifier(rarity: LootRarity, luckStat: number): number {
        const normalizedLuck = Math.max(0, luckStat);

        switch (rarity) {
            case "COMMON":
                // Common drop weight decays by up to 50% at 100 luck (minimum weight modifier 0.10)
                return Math.max(0.1, 1.0 - (normalizedLuck / 200));
            case "UNCOMMON":
                // Mild linear scaling (+20% at 100 luck)
                return 1.0 + (normalizedLuck / 500);
            case "RARE":
                // Linear scaling (+50% at 100 luck)
                return 1.0 + (normalizedLuck / 200);
            case "EPIC":
                // Exact linear scaling (+150% at 100 luck)
                return 1.0 + (normalizedLuck * 1.5 / 100);
            case "LEGENDARY":
                // Aggressive linear scaling (+400% at 100 luck)
                return 1.0 + (normalizedLuck / 25);
            default:
                return 1.0;
        }
    }

    /**
     * Skews the loot table weights based on the player's luck stat.
     */
    public static calculateSkewedWeights(
        baseTable: LootTableEntry[],
        luckStat: number
    ): Array<{ item: LootTableEntry; skewedWeight: number }> {
        return baseTable.map((entry) => {
            const mod = this.getRarityWeightModifier(entry.rarity, luckStat);
            return {
                item: entry,
                skewedWeight: Math.max(0.01, entry.baseWeight * mod),
            };
        });
    }

    /**
     * Executes a weighted roll to determine the dropped item.
     */
    public static rollLootDrop(
        baseTable: LootTableEntry[],
        luckStat: number,
        rng: () => number = Math.random
    ): LootTableEntry | null {
        if (baseTable.length === 0) return null;

        const skewed = this.calculateSkewedWeights(baseTable, luckStat);
        let totalWeight = 0;

        for (const s of skewed) {
            totalWeight += s.skewedWeight;
        }

        let roll = rng() * totalWeight;

        for (const s of skewed) {
            if (roll < s.skewedWeight) {
                return s.item;
            }
            roll -= s.skewedWeight;
        }

        return skewed[skewed.length - 1].item;
    }
}