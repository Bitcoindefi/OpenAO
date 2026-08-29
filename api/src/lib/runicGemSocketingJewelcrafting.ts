/**
 * Runic Gem Socketing, Prismatic Sockets & Jewelcrafting Synergy Engine for OpenAO MMORPG.
 * Simulates chisel socket drilling, gemstone socketing (Ruby, Sapphire, Emerald, Topaz, Diamond),
 * socket extraction, and full prismatic color matching synergy bonuses (+20% stat resonance).
 */

export type SocketColor = "RED" | "BLUE" | "GREEN" | "YELLOW" | "PRISMATIC";
export type GemstoneType = "RUBY_OF_FRENZY" | "SAPPHIRE_OF_FROST" | "EMERALD_OF_VITALITY" | "TOPAZ_OF_HASTE" | "DIAMOND_OF_INVULNERABILITY";

export interface GemstoneData {
    gemType: GemstoneType;
    matchingColor: SocketColor;
    statType: string;
    baseBonusValue: number;
}

export interface EquipmentSocket {
    socketIndex: number;
    colorAffinity: SocketColor;
    insertedGem?: GemstoneType;
}

export interface SocketableEquipment {
    itemId: string;
    itemName: string;
    maxSocketCapacity: number; // 1 to 3
    sockets: EquipmentSocket[];
    isDestroyed: boolean;
}

export const GEMSTONE_CATALOG: Record<GemstoneType, GemstoneData> = {
    RUBY_OF_FRENZY: { gemType: "RUBY_OF_FRENZY", matchingColor: "RED", statType: "ATTACK_POWER", baseBonusValue: 35 },
    SAPPHIRE_OF_FROST: { gemType: "SAPPHIRE_OF_FROST", matchingColor: "BLUE", statType: "MAX_MANA", baseBonusValue: 300 },
    EMERALD_OF_VITALITY: { gemType: "EMERALD_OF_VITALITY", matchingColor: "GREEN", statType: "MAX_HEALTH", baseBonusValue: 400 },
    TOPAZ_OF_HASTE: { gemType: "TOPAZ_OF_HASTE", matchingColor: "YELLOW", statType: "MOVE_SPEED", baseBonusValue: 25 },
    DIAMOND_OF_INVULNERABILITY: { gemType: "DIAMOND_OF_INVULNERABILITY", matchingColor: "PRISMATIC", statType: "ARMOR_RATING", baseBonusValue: 50 },
};

export class RunicGemSocketingJewelcraftingEngine {
    public static readonly MAX_SOCKET_CAPACITY = 3;

    /**
     * Drills a new socket into equipment using a jewelcrafter's chisel.
     */
    public static drillSocket(
        equipment: SocketableEquipment,
        colorAffinity: SocketColor
    ): { success: boolean; socketCount: number; newSocketIndex: number; reason?: string } {
        if (!equipment || equipment.isDestroyed) {
            return { success: false, socketCount: 0, newSocketIndex: -1, reason: "Equipment is invalid or destroyed." };
        }

        if (!Array.isArray(equipment.sockets)) {
            equipment.sockets = [];
        }

        const effectiveMax = Math.min(this.MAX_SOCKET_CAPACITY, Math.max(1, equipment.maxSocketCapacity || 1));
        if (equipment.sockets.length >= effectiveMax) {
            return { success: false, socketCount: equipment.sockets.length, newSocketIndex: -1, reason: `Maximum socket capacity (${effectiveMax}) reached.` };
        }

        const newIndex = equipment.sockets.length;
        equipment.sockets.push({
            socketIndex: newIndex,
            colorAffinity: colorAffinity || "PRISMATIC",
        });

        return {
            success: true,
            socketCount: equipment.sockets.length,
            newSocketIndex: newIndex,
        };
    }

    /**
     * Inserts a gemstone into a designated socket on the equipment.
     */
    public static socketGem(
        equipment: SocketableEquipment,
        socketIndex: number,
        gemType: GemstoneType
    ): { success: boolean; isMatchingSynergy: boolean; reason?: string } {
        if (!equipment || equipment.isDestroyed || !equipment.sockets || !equipment.sockets[socketIndex]) {
            return { success: false, isMatchingSynergy: false, reason: "Invalid socket index or destroyed equipment." };
        }

        const gemData = GEMSTONE_CATALOG[gemType];
        if (!gemData) {
            return { success: false, isMatchingSynergy: false, reason: `Unknown gemstone: ${String(gemType)}` };
        }

        const socket = equipment.sockets[socketIndex];
        if (socket.insertedGem) {
            return { success: false, isMatchingSynergy: false, reason: "Socket is already occupied by a gem." };
        }

        socket.insertedGem = gemType;
        const isMatch = socket.colorAffinity === "PRISMATIC" || socket.colorAffinity === gemData.matchingColor;

        return {
            success: true,
            isMatchingSynergy: isMatch,
        };
    }

    /**
     * Extracts an inserted gemstone from a socket.
     */
    public static unsocketGem(
        equipment: SocketableEquipment,
        socketIndex: number
    ): { success: boolean; extractedGem?: GemstoneType; reason?: string } {
        if (!equipment || equipment.isDestroyed || !equipment.sockets || !equipment.sockets[socketIndex]) {
            return { success: false, reason: "Invalid socket index or destroyed equipment." };
        }

        const socket = equipment.sockets[socketIndex];
        if (!socket.insertedGem) {
            return { success: false, reason: "Socket is empty." };
        }

        const gem = socket.insertedGem;
        socket.insertedGem = undefined;

        return {
            success: true,
            extractedGem: gem,
        };
    }

    /**
     * Calculates total aggregated stat bonuses provided by all socketed gems including prismatic harmony bonus.
     */
    public static calculateSocketedStats(
        equipment: SocketableEquipment
    ): { stats: Record<string, number>; isPrismaticHarmonyActive: boolean } {
        const stats: Record<string, number> = {};
        if (!equipment || equipment.isDestroyed || !Array.isArray(equipment.sockets) || equipment.sockets.length === 0) {
            return { stats, isPrismaticHarmonyActive: false };
        }

        let totalGems = 0;
        let matchedGems = 0;

        for (const socket of equipment.sockets) {
            if (!socket.insertedGem) continue;
            totalGems++;

            const gemData = GEMSTONE_CATALOG[socket.insertedGem];
            if (!gemData) continue;

            const isMatch = socket.colorAffinity === "PRISMATIC" || socket.colorAffinity === gemData.matchingColor;
            if (isMatch) matchedGems++;

            stats[gemData.statType] = (stats[gemData.statType] || 0) + gemData.baseBonusValue;
        }

        // Prismatic Harmony bonus (+20% bonus when all sockets are filled and matched)
        const isHarmony = totalGems > 0 && totalGems === equipment.sockets.length && matchedGems === totalGems;
        if (isHarmony) {
            for (const key of Object.keys(stats)) {
                stats[key] = Math.round(stats[key] * 1.20);
            }
        }

        return {
            stats,
            isPrismaticHarmonyActive: isHarmony,
        };
    }
}