import crypto from "node:crypto";

/**
 * Astral Stargazing, Zodiac Constellation Alignment & Astrological Blessing Engine for OpenAO MMORPG.
 * Simulates telescope sky quadrant mapping, star charting, lunar resonance multipliers (New, Crescent, Half, Full Moon),
 * and channeling celestial blessings.
 */

export type SkyQuadrant = "NORTH" | "SOUTH" | "EAST" | "WEST";
export type ZodiacConstellation = "THE_DRAGON" | "THE_PHOENIX" | "THE_TITAN" | "THE_VOID_WEAVER";
export type LunarPhase = "NEW_MOON" | "CRESCENT_MOON" | "HALF_MOON" | "FULL_MOON";

export interface ConstellationData {
    name: ZodiacConstellation;
    quadrant: SkyQuadrant;
    requiredStars: number;
    baseBlessingBonus: number;
}

export interface TelescopeObservationSession {
    sessionId: string;
    playerId: string;
    targetConstellation: ZodiacConstellation;
    starsMappedCount: number;
    requiredStarsCount: number;
    isFullyCharted: boolean;
}

export interface ActiveAstrologicalBlessing {
    blessingId: string;
    playerId: string;
    constellation: ZodiacConstellation;
    lunarPhase: LunarPhase;
    bonusStatValue: number;
    durationSeconds: number;
    expiresAtEpochMs: number;
}

export const CONSTELLATION_CATALOG: Record<ZodiacConstellation, ConstellationData> = {
    THE_DRAGON: { name: "THE_DRAGON", quadrant: "NORTH", requiredStars: 5, baseBlessingBonus: 50 },
    THE_PHOENIX: { name: "THE_PHOENIX", quadrant: "SOUTH", requiredStars: 4, baseBlessingBonus: 40 },
    THE_TITAN: { name: "THE_TITAN", quadrant: "EAST", requiredStars: 6, baseBlessingBonus: 60 },
    THE_VOID_WEAVER: { name: "THE_VOID_WEAVER", quadrant: "WEST", requiredStars: 5, baseBlessingBonus: 55 },
};

export const LUNAR_PHASE_MULTIPLIERS: Record<LunarPhase, number> = {
    NEW_MOON: 1.0,
    CRESCENT_MOON: 1.25,
    HALF_MOON: 1.5,
    FULL_MOON: 2.0,
};

export class AstronomyConstellationStargazingEngine {
    /**
     * Starts a telescope observation session targeting a constellation with collision-resistant UUID.
     */
    public static startObservationSession(
        playerId: string,
        constellation: ZodiacConstellation,
        currentEpochMs = Date.now()
    ): TelescopeObservationSession {
        const data = CONSTELLATION_CATALOG[constellation];
        if (!data) {
            throw new Error(`Unsupported constellation: ${String(constellation)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            sessionId: `obs_${constellation.toLowerCase()}_${uuid}`,
            playerId,
            targetConstellation: constellation,
            starsMappedCount: 0,
            requiredStarsCount: data.requiredStars,
            isFullyCharted: false,
        };
    }

    /**
     * Maps a star into the active constellation chart.
     */
    public static mapStar(
        session: TelescopeObservationSession,
        quadrantAligned: SkyQuadrant
    ): { success: boolean; starsMapped: number; isCompleted: boolean; reason?: string } {
        if (!session || session.isFullyCharted) {
            return { success: false, starsMapped: session?.starsMappedCount ?? 0, isCompleted: session?.isFullyCharted ?? false, reason: "Observation session already completed." };
        }

        const data = CONSTELLATION_CATALOG[session.targetConstellation];
        if (quadrantAligned !== data.quadrant) {
            return { success: false, starsMapped: session.starsMappedCount, isCompleted: false, reason: `Telescope aimed at ${quadrantAligned}, but ${data.name} is located in the ${data.quadrant} sky.` };
        }

        session.starsMappedCount += 1;
        if (session.starsMappedCount >= session.requiredStarsCount) {
            session.isFullyCharted = true;
        }

        return {
            success: true,
            starsMapped: session.starsMappedCount,
            isCompleted: session.isFullyCharted,
        };
    }

    /**
     * Channels a celestial blessing from a completed constellation chart under current lunar phase with UUID identifier.
     */
    public static channelCelestialBlessing(
        session: TelescopeObservationSession,
        lunarPhase: LunarPhase,
        durationMinutes = 15,
        currentEpochMs = Date.now()
    ): { success: boolean; blessing?: ActiveAstrologicalBlessing; reason?: string } {
        if (!session || !session.isFullyCharted) {
            return { success: false, reason: "Cannot channel blessing from an incomplete constellation chart." };
        }

        const data = CONSTELLATION_CATALOG[session.targetConstellation];
        const lunarMult = LUNAR_PHASE_MULTIPLIERS[lunarPhase] ?? 1.0;
        const totalStatBonus = Math.round(data.baseBlessingBonus * lunarMult);
        const dur = Number.isFinite(durationMinutes) ? Math.max(1, durationMinutes) : 15;
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const blessing: ActiveAstrologicalBlessing = {
            blessingId: `bless_${session.targetConstellation.toLowerCase()}_${uuid}`,
            playerId: session.playerId,
            constellation: session.targetConstellation,
            lunarPhase,
            bonusStatValue: totalStatBonus,
            durationSeconds: dur * 60,
            expiresAtEpochMs: currentEpochMs + dur * 60 * 1000,
        };

        return {
            success: true,
            blessing,
        };
    }
}