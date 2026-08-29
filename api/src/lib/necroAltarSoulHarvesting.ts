import crypto from "node:crypto";

/**
 * Ancient Necro-Altar, Soul Harvesting & Spectral Wraith Phylactery Engine for OpenAO MMORPG.
 * Simulates harvesting wandering spirits (Lost Soul, Tormented Banshee, Dread Lich Remnant),
 * phylactery containment vessels, dark sacrificial rituals, and spectral aura wards.
 */

export type WanderingSpiritType = "LOST_WANDERING_SOUL" | "TORMENTED_BANSHEE" | "DREAD_LICH_REMNANT";
export type PhylacteryTier = "CRUDE_BONE_URN" | "EBON_PHYLACTERY" | "ASTRAL_VOID_CHALICE";
export type NecroAltarRitualType = "SPECTRAL_SHROUD_WARD" | "UNHOLY_EMPOWERMENT" | "SUMMON_SKELETAL_MINION";

export interface SpiritData {
    spiritType: WanderingSpiritType;
    soulEssenceYield: number;
    captureDifficulty: number; // 0 to 100
}

export interface PhylacteryVessel {
    phylacteryId: string;
    ownerPlayerId: string;
    tier: PhylacteryTier;
    maxEssenceCapacity: number;
    currentEssence: number;
    isCracked: boolean;
}

export interface AltarRitualData {
    ritualType: NecroAltarRitualType;
    essenceCost: number;
    buffDurationSeconds: number;
    bonusValue: number;
}

export const SPIRIT_CATALOG: Record<WanderingSpiritType, SpiritData> = {
    LOST_WANDERING_SOUL: { spiritType: "LOST_WANDERING_SOUL", soulEssenceYield: 5, captureDifficulty: 20 },
    TORMENTED_BANSHEE: { spiritType: "TORMENTED_BANSHEE", soulEssenceYield: 15, captureDifficulty: 50 },
    DREAD_LICH_REMNANT: { spiritType: "DREAD_LICH_REMNANT", soulEssenceYield: 40, captureDifficulty: 80 },
};

export const PHYLACTERY_CAPACITIES: Record<PhylacteryTier, number> = {
    CRUDE_BONE_URN: 100,
    EBON_PHYLACTERY: 300,
    ASTRAL_VOID_CHALICE: 600,
};

export const RITUAL_CATALOG: Record<NecroAltarRitualType, AltarRitualData> = {
    SPECTRAL_SHROUD_WARD: { ritualType: "SPECTRAL_SHROUD_WARD", essenceCost: 30, buffDurationSeconds: 120, bonusValue: 25 }, // +25% Dodge
    UNHOLY_EMPOWERMENT: { ritualType: "UNHOLY_EMPOWERMENT", essenceCost: 60, buffDurationSeconds: 180, bonusValue: 45 }, // +45 Spell Power
    SUMMON_SKELETAL_MINION: { ritualType: "SUMMON_SKELETAL_MINION", essenceCost: 80, buffDurationSeconds: 300, bonusValue: 150 }, // Minion HP
};

export class NecroAltarSoulHarvestingEngine {
    /**
     * Crafts a new phylactery containment vessel.
     */
    public static craftPhylactery(
        ownerPlayerId: string,
        tier: PhylacteryTier,
        currentEpochMs = Date.now()
    ): PhylacteryVessel {
        const capacity = PHYLACTERY_CAPACITIES[tier];
        if (!capacity) {
            throw new Error(`Unsupported phylactery tier: ${String(tier)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            phylacteryId: `phylactery_${tier.toLowerCase()}_${uuid}`,
            ownerPlayerId,
            tier,
            maxEssenceCapacity: capacity,
            currentEssence: 0,
            isCracked: false,
        };
    }

    /**
     * Harvests wandering spirit essence into the phylactery vessel.
     */
    public static harvestSpirit(
        phylactery: PhylacteryVessel,
        spirit: WanderingSpiritType,
        reaperSkillLevel = 1,
        rng: () => number = Math.random
    ): { success: boolean; essenceHarvested: number; newTotalEssence: number; isCapacityFull: boolean; reason?: string } {
        if (!phylactery || phylactery.isCracked) {
            return { success: false, essenceHarvested: 0, newTotalEssence: 0, isCapacityFull: false, reason: "Phylactery is cracked or invalid." };
        }

        const spiritData = SPIRIT_CATALOG[spirit];
        if (!spiritData) {
            return { success: false, essenceHarvested: 0, newTotalEssence: phylactery.currentEssence, isCapacityFull: false, reason: `Unknown spirit type: ${String(spirit)}` };
        }

        if (phylactery.currentEssence >= phylactery.maxEssenceCapacity) {
            return { success: false, essenceHarvested: 0, newTotalEssence: phylactery.currentEssence, isCapacityFull: true, reason: "Phylactery vessel is completely full." };
        }

        const skill = Number.isFinite(reaperSkillLevel) ? Math.max(1, reaperSkillLevel) : 1;
        const catchRate = Math.max(15, Math.min(95, 100 - spiritData.captureDifficulty + skill * 5));

        if (rng() * 100 >= catchRate) {
            return { success: false, essenceHarvested: 0, newTotalEssence: phylactery.currentEssence, isCapacityFull: false, reason: "The spirit dispersed into the ether." };
        }

        const space = phylactery.maxEssenceCapacity - phylactery.currentEssence;
        const harvested = Math.min(space, spiritData.soulEssenceYield);
        phylactery.currentEssence += harvested;

        return {
            success: true,
            essenceHarvested: harvested,
            newTotalEssence: phylactery.currentEssence,
            isCapacityFull: phylactery.currentEssence >= phylactery.maxEssenceCapacity,
        };
    }

    /**
     * Performs a dark sacrificial ritual at the Necro-Altar consuming soul essence.
     */
    public static channelAltarRitual(
        phylactery: PhylacteryVessel,
        ritual: NecroAltarRitualType
    ): { success: boolean; ritualApplied?: AltarRitualData; remainingEssence: number; reason?: string } {
        if (!phylactery || phylactery.isCracked) {
            return { success: false, remainingEssence: 0, reason: "Phylactery is cracked or invalid." };
        }

        const ritualData = RITUAL_CATALOG[ritual];
        if (!ritualData) {
            return { success: false, remainingEssence: phylactery.currentEssence, reason: `Unknown altar ritual: ${String(ritual)}` };
        }

        if (phylactery.currentEssence < ritualData.essenceCost) {
            return { success: false, remainingEssence: phylactery.currentEssence, reason: `Insufficient soul essence. Requires ${ritualData.essenceCost}, have ${phylactery.currentEssence}.` };
        }

        phylactery.currentEssence -= ritualData.essenceCost;

        return {
            success: true,
            ritualApplied: ritualData,
            remainingEssence: phylactery.currentEssence,
        };
    }
}