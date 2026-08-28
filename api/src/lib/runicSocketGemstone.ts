/**
 * Arcane Runic Socket & Elemental Gemstone Infusion Engine for OpenAO MMORPG.
 * Simulates socketing elemental gems into gear, chiseling new sockets with risk thresholds,
 * gem extraction, and aggregating compound elemental offensive and defensive stats.
 */

export type GemstoneType = "RUBY" | "SAPPHIRE" | "TOPAZ" | "EMERALD" | "DIAMOND";
export type GemstoneQuality = "CHIPPED" | "FLAWED" | "REGULAR" | "FLAWLESS" | "PERFECT";
export type EquipmentSlotType = "WEAPON" | "ARMOR";

export interface GemstoneDefinition {
    gemType: GemstoneType;
    quality: GemstoneQuality;
    weaponBonus: { stat: string; value: number };
    armorBonus: { stat: string; value: number };
}

export interface SocketedGearItem {
    itemId: string;
    slot: EquipmentSlotType;
    totalSockets: number;
    socketedGems: Array<GemstoneDefinition | null>;
    isDestroyed?: boolean;
}

export const QUALITY_MULTIPLIERS: Record<GemstoneQuality, number> = {
    CHIPPED: 1,
    FLAWED: 2,
    REGULAR: 4,
    FLAWLESS: 7,
    PERFECT: 12,
};

export class RunicSocketGemstoneEngine {
    public static readonly MAX_SOCKETS = 3;

    /**
     * Creates a gemstone definition with scaled quality bonuses, throwing fast on invalid runtime inputs.
     */
    public static createGem(gemType: GemstoneType, quality: GemstoneQuality): GemstoneDefinition {
        const mult = QUALITY_MULTIPLIERS[quality] ?? 1;
        switch (gemType) {
            case "RUBY":
                return {
                    gemType,
                    quality,
                    weaponBonus: { stat: "fireDamage", value: 5 * mult },
                    armorBonus: { stat: "fireResistance", value: 4 * mult },
                };
            case "SAPPHIRE":
                return {
                    gemType,
                    quality,
                    weaponBonus: { stat: "frostDamage", value: 4 * mult },
                    armorBonus: { stat: "maxMana", value: 15 * mult },
                };
            case "TOPAZ":
                return {
                    gemType,
                    quality,
                    weaponBonus: { stat: "lightningDamage", value: 6 * mult },
                    armorBonus: { stat: "criticalStrikeChance", value: 1 * mult },
                };
            case "EMERALD":
                return {
                    gemType,
                    quality,
                    weaponBonus: { stat: "poisonDamage", value: 4 * mult },
                    armorBonus: { stat: "maxStamina", value: 20 * mult },
                };
            case "DIAMOND":
                return {
                    gemType,
                    quality,
                    weaponBonus: { stat: "holyDamage", value: 7 * mult },
                    armorBonus: { stat: "physicalDefense", value: 5 * mult },
                };
            default:
                throw new Error(`Unsupported or invalid gemstone type: ${String(gemType)}`);
        }
    }

    /**
     * Attempts to chisel an additional socket into the item, resetting sockets upon destruction.
     */
    public static chiselSocket(
        item: SocketedGearItem,
        useProtectionScroll = false,
        rng: () => number = Math.random
    ): { success: boolean; totalSockets: number; itemDestroyed: boolean; reason?: string } {
        if (!item || item.isDestroyed) {
            return { success: false, totalSockets: item?.totalSockets ?? 0, itemDestroyed: true, reason: "Item is already destroyed or invalid." };
        }

        item.socketedGems = Array.isArray(item.socketedGems) ? item.socketedGems : [];
        item.totalSockets = Math.max(0, item.totalSockets ?? 0);

        if (item.totalSockets >= this.MAX_SOCKETS) {
            return {
                success: false,
                totalSockets: item.totalSockets,
                itemDestroyed: false,
                reason: `Item already has the maximum of ${this.MAX_SOCKETS} sockets.`,
            };
        }

        // Socket 1: 80% success, Socket 2: 50% success, Socket 3: 25% success
        const chances = [0.80, 0.50, 0.25];
        const successRate = chances[item.totalSockets] ?? 0.20;

        const roll = rng();
        if (roll < successRate) {
            item.totalSockets += 1;
            item.socketedGems.push(null);
            return { success: true, totalSockets: item.totalSockets, itemDestroyed: false };
        }

        // Failed roll: If no protection scroll, 50% chance item is ruined
        if (!useProtectionScroll && rng() < 0.50) {
            item.isDestroyed = true;
            item.totalSockets = 0;
            item.socketedGems = [];
            return { success: false, totalSockets: 0, itemDestroyed: true, reason: "Chiseling failed catastrophically! Item was destroyed." };
        }

        return { success: false, totalSockets: item.totalSockets, itemDestroyed: false, reason: "Chiseling failed. Item remained intact." };
    }

    /**
     * Sockets a gemstone into an empty slot.
     */
    public static insertGem(
        item: SocketedGearItem,
        socketIndex: number,
        gem: GemstoneDefinition
    ): { success: boolean; reason?: string } {
        if (!item || item.isDestroyed) return { success: false, reason: "Item is destroyed or invalid." };
        if (!gem || !gem.gemType || !gem.quality) return { success: false, reason: "Invalid gemstone provided." };

        item.socketedGems = Array.isArray(item.socketedGems) ? item.socketedGems : [];
        if (socketIndex < 0 || socketIndex >= item.totalSockets) {
            return { success: false, reason: `Invalid socket index ${socketIndex}. Total sockets: ${item.totalSockets}.` };
        }
        if (item.socketedGems[socketIndex] !== null && item.socketedGems[socketIndex] !== undefined) {
            return { success: false, reason: "Socket is already occupied." };
        }

        item.socketedGems[socketIndex] = gem;
        return { success: true };
    }

    /**
     * Extracts / unsockets a gemstone from a specific socket index.
     */
    public static removeGem(
        item: SocketedGearItem,
        socketIndex: number
    ): { success: boolean; extractedGem?: GemstoneDefinition; reason?: string } {
        if (!item || item.isDestroyed) return { success: false, reason: "Item is destroyed or invalid." };
        item.socketedGems = Array.isArray(item.socketedGems) ? item.socketedGems : [];

        if (socketIndex < 0 || socketIndex >= item.totalSockets) {
            return { success: false, reason: "Invalid socket index." };
        }

        const existingGem = item.socketedGems[socketIndex];
        if (!existingGem) {
            return { success: false, reason: "No gemstone in specified socket." };
        }

        item.socketedGems[socketIndex] = null;
        return { success: true, extractedGem: existingGem };
    }

    /**
     * Aggregates all active stats provided by inserted gemstones.
     */
    public static aggregateStats(item: SocketedGearItem): Record<string, number> {
        if (!item || item.isDestroyed) return {};

        const totals: Record<string, number> = {};
        const gems = Array.isArray(item.socketedGems) ? item.socketedGems : [];

        for (const gem of gems) {
            if (!gem) continue;
            const bonus = item.slot === "WEAPON" ? gem.weaponBonus : gem.armorBonus;
            if (bonus && bonus.stat && Number.isFinite(bonus.value)) {
                totals[bonus.stat] = (totals[bonus.stat] ?? 0) + bonus.value;
            }
        }

        return totals;
    }
}