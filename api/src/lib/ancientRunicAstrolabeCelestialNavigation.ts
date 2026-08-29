import crypto from "node:crypto";

/**
 * Ancient Runic Astrolabe, Celestial Constellation Alignment & Astral Navigation Engine for OpenAO MMORPG.
 * Simulates celestial astrolabes (Solar Meridian, Lunar Horizon, Void Zenith), aligning ancient constellations
 * (The Great Dragon, The Titan Hammer, The Celestial Phoenix), star chart parchment charting, and starlight recharging.
 */

export type AstrolabeType = "SOLAR_MERIDIAN_ASTROLABE" | "LUNAR_HORIZON_ASTROLABE" | "VOID_ZENITH_ASTROLABE";
export type CelestialConstellationType = "THE_GREAT_DRAGON_CONSTELLATION" | "THE_TITAN_HAMMER_CONSTELLATION" | "THE_CELESTIAL_PHOENIX_CONSTELLATION";

export interface AstrolabeData {
    astrolabeType: AstrolabeType;
    precisionRating: number;
    maxStarlightCharge: number;
    baseBuffDurationSeconds: number;
}

export interface ConstellationCoordinates {
    constellationType: CelestialConstellationType;
    constellationName: string;
    rightAscensionDegrees: number; // 0 to 359
    declinationDegrees: number; // -90 to +90
    buffEffectName: string;
}

export interface ActiveAstrolabe {
    astrolabeId: string;
    navigatorPlayerId: string;
    astrolabeType: AstrolabeType;
    currentStarlightCharge: number; // 0 to max
    maxStarlightCharge: number;
    isAttuned: boolean;
}

export interface StarChartParchment {
    chartId: string;
    chartedConstellation: CelestialConstellationType;
    buffEffect: string;
    durationSeconds: number;
    createdEpochMs: number;
}

export const ASTROLABE_CATALOG: Record<AstrolabeType, AstrolabeData> = {
    SOLAR_MERIDIAN_ASTROLABE: { astrolabeType: "SOLAR_MERIDIAN_ASTROLABE", precisionRating: 90, maxStarlightCharge: 100, baseBuffDurationSeconds: 300 },
    LUNAR_HORIZON_ASTROLABE: { astrolabeType: "LUNAR_HORIZON_ASTROLABE", precisionRating: 80, maxStarlightCharge: 80, baseBuffDurationSeconds: 240 },
    VOID_ZENITH_ASTROLABE: { astrolabeType: "VOID_ZENITH_ASTROLABE", precisionRating: 100, maxStarlightCharge: 150, baseBuffDurationSeconds: 450 },
};

export const CONSTELLATION_CATALOG: Record<CelestialConstellationType, ConstellationCoordinates> = {
    THE_GREAT_DRAGON_CONSTELLATION: { constellationType: "THE_GREAT_DRAGON_CONSTELLATION", constellationName: "The Great Dragon", rightAscensionDegrees: 45, declinationDegrees: 30, buffEffectName: "DRAGON_SPEED_SURGE_30" },
    THE_TITAN_HAMMER_CONSTELLATION: { constellationType: "THE_TITAN_HAMMER_CONSTELLATION", constellationName: "The Titan Hammer", rightAscensionDegrees: 120, declinationDegrees: 60, buffEffectName: "TITAN_CRIT_BONUS_25" },
    THE_CELESTIAL_PHOENIX_CONSTELLATION: { constellationType: "THE_CELESTIAL_PHOENIX_CONSTELLATION", constellationName: "The Celestial Phoenix", rightAscensionDegrees: 270, declinationDegrees: -15, buffEffectName: "PHOENIX_REBIRTH_WARD" },
};

export class AncientRunicAstrolabeCelestialNavigationEngine {
    public static readonly ALIGNMENT_COST_CHARGES = 20;
    public static readonly ANGLE_TOLERANCE_DEGREES = 5;

    /**
     * Crafts a new celestial astrolabe.
     */
    public static craftAstrolabe(
        navigatorPlayerId: string,
        astrolabeType: AstrolabeType,
        currentEpochMs = Date.now()
    ): ActiveAstrolabe {
        const data = ASTROLABE_CATALOG[astrolabeType];
        if (!data) {
            throw new Error(`Unsupported astrolabe type: ${String(astrolabeType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            astrolabeId: `astrolabe_${astrolabeType.toLowerCase()}_${uuid}`,
            navigatorPlayerId,
            astrolabeType,
            currentStarlightCharge: data.maxStarlightCharge,
            maxStarlightCharge: data.maxStarlightCharge,
            isAttuned: true,
        };
    }

    /**
     * Aligns the astrolabe with a celestial constellation to produce a Star Chart Parchment.
     */
    public static alignConstellation(
        astrolabe: ActiveAstrolabe,
        targetConstellation: CelestialConstellationType,
        inputRightAscensionDegrees: number,
        inputDeclinationDegrees: number,
        currentEpochMs = Date.now()
    ): { success: boolean; starChart?: StarChartParchment; remainingCharges: number; reason?: string } {
        if (!astrolabe || !astrolabe.isAttuned) {
            return { success: false, remainingCharges: 0, reason: "Astrolabe is invalid or unattuned." };
        }

        const constellationData = CONSTELLATION_CATALOG[targetConstellation];
        if (!constellationData) {
            return { success: false, remainingCharges: astrolabe.currentStarlightCharge, reason: `Unknown constellation: ${String(targetConstellation)}` };
        }

        if (astrolabe.currentStarlightCharge < this.ALIGNMENT_COST_CHARGES) {
            return { success: false, remainingCharges: astrolabe.currentStarlightCharge, reason: `Insufficient starlight charge. Requires ${this.ALIGNMENT_COST_CHARGES}, available: ${astrolabe.currentStarlightCharge}.` };
        }

        if (!Number.isFinite(inputRightAscensionDegrees) || inputRightAscensionDegrees < 0 || inputRightAscensionDegrees >= 360 ||
            !Number.isFinite(inputDeclinationDegrees) || inputDeclinationDegrees < -90 || inputDeclinationDegrees > 90) {
            return { success: false, remainingCharges: astrolabe.currentStarlightCharge, reason: "Invalid celestial coordinates. RA must be [0, 360) and Dec must be [-90, +90]." };
        }

        const ra = inputRightAscensionDegrees;
        const dec = inputDeclinationDegrees;

        const raDiff = Math.min(Math.abs(ra - constellationData.rightAscensionDegrees), 360 - Math.abs(ra - constellationData.rightAscensionDegrees));
        const decDiff = Math.abs(dec - constellationData.declinationDegrees);

        if (raDiff > this.ANGLE_TOLERANCE_DEGREES || decDiff > this.ANGLE_TOLERANCE_DEGREES) {
            return { success: false, remainingCharges: astrolabe.currentStarlightCharge, reason: `Constellation misaligned. RA diff=${raDiff} deg, Dec diff=${decDiff} deg.` };
        }

        astrolabe.currentStarlightCharge -= this.ALIGNMENT_COST_CHARGES;

        const astrolabeData = ASTROLABE_CATALOG[astrolabe.astrolabeType];
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const starChart: StarChartParchment = {
            chartId: `starchart_${uuid}`,
            chartedConstellation: targetConstellation,
            buffEffect: constellationData.buffEffectName,
            durationSeconds: astrolabeData.baseBuffDurationSeconds,
            createdEpochMs: currentEpochMs,
        };

        return {
            success: true,
            starChart,
            remainingCharges: astrolabe.currentStarlightCharge,
        };
    }

    /**
     * Channels open starlight to recharge the astrolabe.
     */
    public static rechargeStarlight(
        astrolabe: ActiveAstrolabe,
        rechargeAmount = 40
    ): { success: boolean; newCharges: number } {
        if (!astrolabe || !astrolabe.isAttuned) return { success: false, newCharges: 0 };

        const amt = Number.isFinite(rechargeAmount) ? Math.max(0, rechargeAmount) : 40;
        astrolabe.currentStarlightCharge = Math.min(astrolabe.maxStarlightCharge, astrolabe.currentStarlightCharge + amt);

        return {
            success: true,
            newCharges: astrolabe.currentStarlightCharge,
        };
    }
}