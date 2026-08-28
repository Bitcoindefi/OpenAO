/**
 * Arcane Disenchanting & Mystic Essence Extraction Forge Engine for OpenAO MMORPG.
 * Simulates the breakdown of enchanted weapons and armor into crafting essences,
 * scaling yields by item rarity tiers, item enchantment power (+1..+10), enchanter skill proficiency,
 * and critical extraction rolls.
 */

export type ItemRarityTier = "COMMON" | "MAGIC" | "RARE" | "EPIC" | "LEGENDARY";
export type EssenceType = "ARCANE_DUST" | "LESSER_MYSTIC_ESSENCE" | "GREATER_MYSTIC_ESSENCE" | "RADIANT_SHARD";

export interface DisenchantYield {
    essence: EssenceType;
    quantity: number;
    isCriticalBonus?: boolean;
}

export interface DisenchantableItem {
    itemId: string;
    itemTemplateId: string;
    rarity: ItemRarityTier;
    enchantmentPower?: number; // e.g. +1 to +10
}

export interface DisenchantResult {
    success: boolean;
    yields: DisenchantYield[];
    totalArcaneDust: number;
    totalDustEquivalent: number;
    wasCriticalExtraction: boolean;
    reason?: string;
}

export const ESSENCE_DUST_VALUES: Record<EssenceType, number> = {
    ARCANE_DUST: 1,
    LESSER_MYSTIC_ESSENCE: 5,
    GREATER_MYSTIC_ESSENCE: 15,
    RADIANT_SHARD: 40,
};

export const RARITY_BASE_YIELDS: Record<ItemRarityTier, { dust: number; essence?: EssenceType; essenceQty: number }> = {
    COMMON: { dust: 2, essenceQty: 0 },
    MAGIC: { dust: 6, essence: "LESSER_MYSTIC_ESSENCE", essenceQty: 1 },
    RARE: { dust: 15, essence: "GREATER_MYSTIC_ESSENCE", essenceQty: 1 },
    EPIC: { dust: 35, essence: "GREATER_MYSTIC_ESSENCE", essenceQty: 3 },
    LEGENDARY: { dust: 80, essence: "RADIANT_SHARD", essenceQty: 2 },
};

export class EnchantmentDisenchantForgeEngine {
    /**
     * Disenchants an item into arcane components with power scaling, skill scaling, and critical bonus rolls.
     */
    public static disenchantItem(
        item: DisenchantableItem,
        playerEnchantingSkill: number,
        rng: () => number = Math.random
    ): DisenchantResult {
        const base = RARITY_BASE_YIELDS[item.rarity];
        if (!base) {
            return {
                success: false,
                yields: [],
                totalArcaneDust: 0,
                totalDustEquivalent: 0,
                wasCriticalExtraction: false,
                reason: "Invalid item rarity.",
            };
        }

        // Guard against NaN/infinite skill inputs
        const rawSkill = Number.isFinite(playerEnchantingSkill) ? playerEnchantingSkill : 1;
        const skill = Math.min(100, Math.max(1, rawSkill));

        // Power multiplier: +10% per enchantment level
        const power = Math.max(0, item.enchantmentPower ?? 0);
        const powerFactor = 1.0 + power * 0.10;

        // Skill scaling factor: 1.0 at skill 1 up to 1.50 at skill 100
        const skillFactor = 1.0 + (skill / 100) * 0.50;

        // Critical Extraction Chance: 5% base + 1% per 10 skill levels (max 15%)
        const criticalChance = 0.05 + skill / 1000;
        const wasCriticalExtraction = rng() < criticalChance;

        const critMultiplier = wasCriticalExtraction ? 2 : 1;
        const dustQty = Math.floor(base.dust * powerFactor * skillFactor * critMultiplier);

        const yields: DisenchantYield[] = [
            {
                essence: "ARCANE_DUST",
                quantity: dustQty,
                isCriticalBonus: wasCriticalExtraction,
            },
        ];

        let totalEquivalent = dustQty * ESSENCE_DUST_VALUES.ARCANE_DUST;

        if (base.essence && base.essenceQty > 0) {
            const essenceQty = Math.max(1, Math.floor(base.essenceQty * (wasCriticalExtraction ? 2 : 1)));
            yields.push({
                essence: base.essence,
                quantity: essenceQty,
                isCriticalBonus: wasCriticalExtraction,
            });
            totalEquivalent += essenceQty * ESSENCE_DUST_VALUES[base.essence];
        }

        return {
            success: true,
            yields,
            totalArcaneDust: dustQty,
            totalDustEquivalent: totalEquivalent,
            wasCriticalExtraction,
        };
    }
}