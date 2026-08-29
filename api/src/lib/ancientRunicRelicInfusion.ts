import crypto from "node:crypto";

/**
 * Ancient Runic Relic Infusion, Elemental Resonance & Socket Imbuing Engine for OpenAO MMORPG.
 * Simulates ancient artifact relics (Crown of the Sun King, Orb of Eternal Tides, Aegis of the Titan Core),
 * socketing primal elemental shards (Solar Amber, Abyssal Sapphire, Earth Emerald),
 * and activating Primal Harmonic Resonance (+40% potency) for matching shards.
 */

export type AncientRelicType = "CROWN_OF_THE_SUN_KING" | "ORB_OF_ETERNAL_TIDES" | "AEGIS_OF_THE_TITAN_CORE";
export type PrimalShardType = "SOLAR_AMBER_SHARD" | "ABYSSAL_SAPPHIRE_SHARD" | "EARTH_EMERALD_SHARD";

export interface RelicBaseData {
    relicType: AncientRelicType;
    relicName: string;
    socketCapacity: number;
    basePowerRating: number;
}

export interface ShardData {
    shardType: PrimalShardType;
    statType: string;
    powerBonus: number;
}

export interface ImbuedRelicArtifact {
    relicId: string;
    ownerPlayerId: string;
    relicType: AncientRelicType;
    relicLevel: number; // 1 to 50
    socketCapacity: number;
    socketedShards: PrimalShardType[];
    totalEffectivePower: number;
    isHarmonized: boolean;
}

export const RELIC_CATALOG: Record<AncientRelicType, RelicBaseData> = {
    CROWN_OF_THE_SUN_KING: { relicType: "CROWN_OF_THE_SUN_KING", relicName: "Crown of the Sun King", socketCapacity: 3, basePowerRating: 100 },
    ORB_OF_ETERNAL_TIDES: { relicType: "ORB_OF_ETERNAL_TIDES", relicName: "Orb of Eternal Tides", socketCapacity: 2, basePowerRating: 80 },
    AEGIS_OF_THE_TITAN_CORE: { relicType: "AEGIS_OF_THE_TITAN_CORE", relicName: "Aegis of the Titan Core", socketCapacity: 4, basePowerRating: 150 },
};

export const SHARD_CATALOG: Record<PrimalShardType, ShardData> = {
    SOLAR_AMBER_SHARD: { shardType: "SOLAR_AMBER_SHARD", statType: "SOLAR_POWER", powerBonus: 25 },
    ABYSSAL_SAPPHIRE_SHARD: { shardType: "ABYSSAL_SAPPHIRE_SHARD", statType: "FROST_SHIELD", powerBonus: 20 },
    EARTH_EMERALD_SHARD: { shardType: "EARTH_EMERALD_SHARD", statType: "FORTITUDE_ARMOR", powerBonus: 35 },
};

export class AncientRunicRelicInfusionEngine {
    /**
     * Crafts a new ancient artifact relic.
     */
    public static createRelic(
        ownerPlayerId: string,
        relicType: AncientRelicType,
        relicLevel = 1,
        currentEpochMs = Date.now()
    ): ImbuedRelicArtifact {
        const relicData = RELIC_CATALOG[relicType];
        if (!relicData) {
            throw new Error(`Unsupported relic type: ${String(relicType)}`);
        }

        const lvl = Number.isFinite(relicLevel) ? Math.max(1, Math.min(50, relicLevel)) : 1;
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const basePower = relicData.basePowerRating + (lvl - 1) * 15;

        return {
            relicId: `relic_${relicType.toLowerCase()}_${uuid}`,
            ownerPlayerId,
            relicType,
            relicLevel: lvl,
            socketCapacity: relicData.socketCapacity,
            socketedShards: [],
            totalEffectivePower: basePower,
            isHarmonized: false,
        };
    }

    /**
     * Sockets a primal elemental shard into the relic.
     */
    public static socketShard(
        relic: ImbuedRelicArtifact,
        shard: PrimalShardType
    ): { success: boolean; totalPower: number; isHarmonized: boolean; reason?: string } {
        if (!relic) {
            return { success: false, totalPower: 0, isHarmonized: false, reason: "Relic is invalid." };
        }

        const shardData = SHARD_CATALOG[shard];
        if (!shardData) {
            return { success: false, totalPower: relic.totalEffectivePower, isHarmonized: relic.isHarmonized, reason: `Unsupported primal shard: ${String(shard)}` };
        }

        if (relic.socketedShards.length >= relic.socketCapacity) {
            return { success: false, totalPower: relic.totalEffectivePower, isHarmonized: relic.isHarmonized, reason: "Relic sockets are completely full." };
        }

        relic.socketedShards.push(shard);

        // Recalculate power and harmonization
        const relicData = RELIC_CATALOG[relic.relicType];
        const basePower = relicData.basePowerRating + (relic.relicLevel - 1) * 15;

        let shardPowerSum = 0;
        for (const s of relic.socketedShards) {
            shardPowerSum += SHARD_CATALOG[s].powerBonus;
        }

        // Harmonization triggers when all sockets are filled with the same shard type
        const isFull = relic.socketedShards.length === relic.socketCapacity;
        const isAllSame = relic.socketedShards.every(s => s === relic.socketedShards[0]);
        const isHarmonized = isFull && isAllSame;

        const harmonyMultiplier = isHarmonized ? 1.40 : 1.0;
        const totalPower = Math.round((basePower + shardPowerSum) * harmonyMultiplier);

        relic.totalEffectivePower = totalPower;
        relic.isHarmonized = isHarmonized;

        return {
            success: true,
            totalPower,
            isHarmonized,
        };
    }

    /**
     * Purges all socketed shards from the relic.
     */
    public static purgeSockets(
        relic: ImbuedRelicArtifact
    ): { success: boolean; recoveredShards: PrimalShardType[]; newTotalPower: number } {
        if (!relic) {
            return { success: false, recoveredShards: [], newTotalPower: 0 };
        }

        const recovered = [...relic.socketedShards];
        relic.socketedShards = [];
        relic.isHarmonized = false;

        const relicData = RELIC_CATALOG[relic.relicType];
        relic.totalEffectivePower = relicData.basePowerRating + (relic.relicLevel - 1) * 15;

        return {
            success: true,
            recoveredShards: recovered,
            newTotalPower: relic.totalEffectivePower,
        };
    }
}