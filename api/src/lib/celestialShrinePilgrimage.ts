import crypto from "node:crypto";

/**
 * Celestial Shrine Pilgrimage, Sacred Offerings & Divine Devotion Engine for OpenAO MMORPG.
 * Simulates visiting elemental shrines, presenting sacred offerings,
 * ascending devotion tiers (Acolyte, Zealot, Champion, Avatar), and unlocking Grand Pilgrim Blessings.
 */

export type ElementalShrineType = "SHRINE_OF_THE_SUN" | "SHRINE_OF_THE_MOON" | "SHRINE_OF_THE_STORM" | "SHRINE_OF_THE_EARTH";
export type SacredOfferingType = "SACRED_INCENSE" | "BLESSED_HOLY_WATER" | "GOLDEN_TITHE";
export type DevotionTier = "ACOLYTE" | "ZEALOT" | "CHAMPION" | "AVATAR_OF_THE_GODS";

export interface ShrineDefinition {
    shrineType: ElementalShrineType;
    blessingName: string;
    statBonusType: string;
    baseBonusValue: number;
}

export interface PlayerPilgrimState {
    playerId: string;
    devotionPietyPoints: number; // 0 to 1000
    currentTier: DevotionTier;
    visitedShrines: Set<ElementalShrineType>;
    lastPilgrimageResetEpochMs: number;
}

export interface ActiveDivineBlessing {
    blessingId: string;
    playerId: string;
    shrineType: ElementalShrineType | "GRAND_PILGRIMAGE";
    blessingName: string;
    bonusStatValue: number;
    durationMinutes: number;
    expiresAtEpochMs: number;
}

export const SHRINE_CATALOG: Record<ElementalShrineType, ShrineDefinition> = {
    SHRINE_OF_THE_SUN: { shrineType: "SHRINE_OF_THE_SUN", blessingName: "Radiant Sunward Aegis", statBonusType: "MAX_HEALTH", baseBonusValue: 300 },
    SHRINE_OF_THE_MOON: { shrineType: "SHRINE_OF_THE_MOON", blessingName: "Lunar Tide Clarity", statBonusType: "MAX_MANA", baseBonusValue: 250 },
    SHRINE_OF_THE_STORM: { shrineType: "SHRINE_OF_THE_STORM", blessingName: "Tempest Tailwind", statBonusType: "MOVE_SPEED", baseBonusValue: 20 },
    SHRINE_OF_THE_EARTH: { shrineType: "SHRINE_OF_THE_EARTH", blessingName: "Granite Bulwark", statBonusType: "ARMOR_RATING", baseBonusValue: 40 },
};

export const OFFERING_PIETY_VALUES: Record<SacredOfferingType, number> = {
    SACRED_INCENSE: 25,
    BLESSED_HOLY_WATER: 50,
    GOLDEN_TITHE: 100,
};

export class CelestialShrinePilgrimageEngine {
    public static readonly MAX_PIETY = 1000;

    /**
     * Calculates current devotion tier based on piety points.
     */
    public static calculateTier(piety: number): DevotionTier {
        if (piety >= 900) return "AVATAR_OF_THE_GODS";
        if (piety >= 500) return "CHAMPION";
        if (piety >= 200) return "ZEALOT";
        return "ACOLYTE";
    }

    /**
     * Presents an offering at a sacred shrine to gain piety points.
     */
    public static presentOffering(
        player: PlayerPilgrimState,
        offering: SacredOfferingType
    ): { success: boolean; newPiety: number; newTier: DevotionTier; reason?: string } {
        if (!player) {
            return { success: false, newPiety: 0, newTier: "ACOLYTE", reason: "Invalid pilgrim player." };
        }

        const pietyGain = OFFERING_PIETY_VALUES[offering];
        if (!pietyGain) {
            return { success: false, newPiety: player.devotionPietyPoints, newTier: player.currentTier, reason: `Unknown offering type: ${String(offering)}` };
        }

        player.devotionPietyPoints = Math.min(this.MAX_PIETY, player.devotionPietyPoints + pietyGain);
        player.currentTier = this.calculateTier(player.devotionPietyPoints);

        return {
            success: true,
            newPiety: player.devotionPietyPoints,
            newTier: player.currentTier,
        };
    }

    /**
     * Visits an elemental shrine, recording pilgrimage progression and granting shrine blessing.
     */
    public static visitShrine(
        player: PlayerPilgrimState,
        shrineType: ElementalShrineType,
        currentEpochMs = Date.now()
    ): { success: boolean; blessing?: ActiveDivineBlessing; isGrandPilgrimEligible: boolean; reason?: string } {
        if (!player) {
            return { success: false, isGrandPilgrimEligible: false, reason: "Invalid pilgrim player." };
        }

        const shrine = SHRINE_CATALOG[shrineType];
        if (!shrine) {
            return { success: false, isGrandPilgrimEligible: false, reason: `Unsupported shrine: ${String(shrineType)}` };
        }

        // Daily pilgrimage reset check (24 hours = 86,400,000 ms)
        if (currentEpochMs - player.lastPilgrimageResetEpochMs >= 86400000) {
            player.visitedShrines = new Set();
            player.lastPilgrimageResetEpochMs = currentEpochMs;
        }

        player.visitedShrines.add(shrineType);

        // Tier multiplier: Acolyte 1.0x, Zealot 1.2x, Champion 1.5x, Avatar 2.0x
        let tierMult = 1.0;
        if (player.currentTier === "AVATAR_OF_THE_GODS") tierMult = 2.0;
        else if (player.currentTier === "CHAMPION") tierMult = 1.5;
        else if (player.currentTier === "ZEALOT") tierMult = 1.2;

        const bonus = Math.round(shrine.baseBonusValue * tierMult);
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const blessing: ActiveDivineBlessing = {
            blessingId: `bless_shrine_${shrineType.toLowerCase()}_${uuid}`,
            playerId: player.playerId,
            shrineType,
            blessingName: shrine.blessingName,
            bonusStatValue: bonus,
            durationMinutes: 60,
            expiresAtEpochMs: currentEpochMs + 60 * 60 * 1000,
        };

        const isGrandPilgrimEligible = player.visitedShrines.size === 4;

        return {
            success: true,
            blessing,
            isGrandPilgrimEligible,
        };
    }

    /**
     * Unlocks Grand Pilgrim Blessing if all 4 shrines were visited in the active 24h cycle, consuming the pilgrimage.
     */
    public static claimGrandPilgrimBlessing(
        player: PlayerPilgrimState,
        currentEpochMs = Date.now()
    ): { success: boolean; blessing?: ActiveDivineBlessing; reason?: string } {
        if (!player) {
            return { success: false, reason: "Invalid pilgrim player." };
        }

        // Apply 24h reset before verifying
        if (currentEpochMs - player.lastPilgrimageResetEpochMs >= 86400000) {
            player.visitedShrines = new Set();
            player.lastPilgrimageResetEpochMs = currentEpochMs;
        }

        if (player.visitedShrines.size < 4) {
            return { success: false, reason: `Grand pilgrimage requires visiting all 4 shrines in the active daily window. Visited: ${player.visitedShrines.size}/4.` };
        }

        // Clear active visited shrines upon claim so pilgrimage must be repeated next cycle
        player.visitedShrines = new Set();

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;
        const blessing: ActiveDivineBlessing = {
            blessingId: `bless_grand_pilgrim_${uuid}`,
            playerId: player.playerId,
            shrineType: "GRAND_PILGRIMAGE",
            blessingName: "Aura of the Celestial Avatar",
            bonusStatValue: 50,
            durationMinutes: 120,
            expiresAtEpochMs: currentEpochMs + 120 * 60 * 1000,
        };

        return {
            success: true,
            blessing,
        };
    }
}