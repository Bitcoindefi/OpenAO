/**
 * Arcane Disenchanting, Essence Extraction & Equipment Reforging Engine for OpenAO MMORPG.
 * Simulates breaking down magical items into elemental essences,
 * applying reforged enchantment prefixes, and evaluating forge instability thresholds.
 */

export type ItemRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type ArcaneEssenceType = "ARCANE_DUST" | "ASTRAL_SHARD" | "VOID_CRYSTAL" | "ETERNAL_PRISMATIC_CORE";
export type ReforgePrefixType = "FLAMING" | "VAMPIRIC" | "INVULNERABLE" | "TITAN_SLAYER";

export interface MagicEquipmentItem {
    itemId: string;
    itemName: string;
    rarity: ItemRarity;
    basePowerRating: number;
    activePrefix?: ReforgePrefixType;
    isDestroyed: boolean;
}

export interface EssenceYieldData {
    essenceType: ArcaneEssenceType;
    yieldCount: number;
}

export interface ReforgePrefixData {
    prefix: ReforgePrefixType;
    requiredEssenceType: ArcaneEssenceType;
    requiredEssenceCount: number;
    statBonusValue: number;
    baseInstabilityPercent: number; // 0 to 100
}

export const ESSENCE_EXTRACTION_CATALOG: Record<ItemRarity, EssenceYieldData> = {
    COMMON: { essenceType: "ARCANE_DUST", yieldCount: 5 },
    RARE: { essenceType: "ASTRAL_SHARD", yieldCount: 3 },
    EPIC: { essenceType: "VOID_CRYSTAL", yieldCount: 2 },
    LEGENDARY: { essenceType: "ETERNAL_PRISMATIC_CORE", yieldCount: 1 },
};

export const REFORGE_PREFIX_CATALOG: Record<ReforgePrefixType, ReforgePrefixData> = {
    FLAMING: { prefix: "FLAMING", requiredEssenceType: "ARCANE_DUST", requiredEssenceCount: 10, statBonusValue: 35, baseInstabilityPercent: 15 },
    VAMPIRIC: { prefix: "VAMPIRIC", requiredEssenceType: "ASTRAL_SHARD", requiredEssenceCount: 6, statBonusValue: 20, baseInstabilityPercent: 25 },
    INVULNERABLE: { prefix: "INVULNERABLE", requiredEssenceType: "VOID_CRYSTAL", requiredEssenceCount: 4, statBonusValue: 50, baseInstabilityPercent: 35 },
    TITAN_SLAYER: { prefix: "TITAN_SLAYER", requiredEssenceType: "ETERNAL_PRISMATIC_CORE", requiredEssenceCount: 2, statBonusValue: 80, baseInstabilityPercent: 50 },
};

export class EnchantmentDisenchantingForgeEngine {
    /**
     * Disenchants a magical item into arcane crafting essences.
     */
    public static disenchantItem(
        item: MagicEquipmentItem
    ): { success: boolean; extractedEssence?: ArcaneEssenceType; yieldCount: number; reason?: string } {
        if (!item || item.isDestroyed) {
            return { success: false, yieldCount: 0, reason: "Item is already destroyed or invalid." };
        }

        const yieldData = ESSENCE_EXTRACTION_CATALOG[item.rarity];
        if (!yieldData) {
            return { success: false, yieldCount: 0, reason: `Unsupported item rarity: ${String(item.rarity)}` };
        }

        item.isDestroyed = true; // Item consumed during disenchanting

        return {
            success: true,
            extractedEssence: yieldData.essenceType,
            yieldCount: yieldData.yieldCount,
        };
    }

    /**
     * Reforges an equipment item with a powerful magical prefix.
     */
    public static reforgeEquipment(
        item: MagicEquipmentItem,
        targetPrefix: ReforgePrefixType,
        availableEssences: Map<ArcaneEssenceType, number>,
        forgeMasterySkill = 50,
        rng: () => number = Math.random
    ): { success: boolean; newPowerRating: number; prefixApplied?: ReforgePrefixType; isFractured: boolean; reason?: string } {
        if (!item || item.isDestroyed) {
            return { success: false, newPowerRating: 0, isFractured: false, reason: "Item is invalid or destroyed." };
        }

        const prefixData = REFORGE_PREFIX_CATALOG[targetPrefix];
        if (!prefixData) {
            return { success: false, newPowerRating: item.basePowerRating, isFractured: false, reason: `Unknown reforge prefix: ${String(targetPrefix)}` };
        }

        const currentEssenceCount = availableEssences?.get(prefixData.requiredEssenceType) ?? 0;
        if (currentEssenceCount < prefixData.requiredEssenceCount) {
            return { success: false, newPowerRating: item.basePowerRating, isFractured: false, reason: `Insufficient ${prefixData.requiredEssenceType}. Required: ${prefixData.requiredEssenceCount}, Available: ${currentEssenceCount}.` };
        }

        const skill = Math.max(1, Math.min(100, Number.isFinite(forgeMasterySkill) ? forgeMasterySkill : 1));
        // Instability formula: Base * (1 - skill/150)
        const netInstabilityPercent = Math.max(5, Math.min(90, prefixData.baseInstabilityPercent * (1 - skill / 150)));

        // Roll for forge fracture BEFORE consuming essences
        if (rng() * 100 < netInstabilityPercent) {
            item.isDestroyed = true;
            return {
                success: false,
                newPowerRating: 0,
                isFractured: true,
                reason: "Forge Instability Overload! The equipment fractured into fragments.",
            };
        }

        // Deduct crafting essences only on successful reforge
        availableEssences.set(prefixData.requiredEssenceType, currentEssenceCount - prefixData.requiredEssenceCount);

        item.activePrefix = targetPrefix;
        item.basePowerRating += prefixData.statBonusValue;

        return {
            success: true,
            newPowerRating: item.basePowerRating,
            prefixApplied: targetPrefix,
            isFractured: false,
        };
    }
}