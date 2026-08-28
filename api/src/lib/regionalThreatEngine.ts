/**
 * Dynamic Regional Threat Level Scaling Engine for OpenAO MMORPG.
 * Scales zone difficulty, monster stats, and elite spawn rates dynamically based on
 * the density and average level of active players to combat high-level farming in low-level zones.
 */

export interface ZoneConfiguration {
    zoneId: string;
    baseLevel: number;
    maxScalingLevel: number;
    densityThresholdSoft: number; // Number of players before threat scaling starts
    densityThresholdHard: number; // Number of players where max threat scaling is reached
}

export interface PlayerInfo {
    playerId: string;
    level: number;
}

export interface RegionalThreatState {
    scaledMonsterLevel: number;
    monsterDamageMultiplier: number;
    monsterHealthMultiplier: number;
    eliteSpawnChancePercent: number; // e.g. 5.0 for 5%
    isOvercrowded: boolean;
}

export class RegionalThreatEngine {
    /**
     * Evaluates the current threat state of a zone based on active player demographics.
     */
    public static evaluateZoneThreat(
        config: ZoneConfiguration,
        activePlayers: PlayerInfo[]
    ): RegionalThreatState {
        if (config.densityThresholdHard <= config.densityThresholdSoft) {
            throw new Error("densityThresholdHard must be strictly greater than densityThresholdSoft");
        }

        const playerCount = activePlayers.length;

        const baseline: RegionalThreatState = {
            scaledMonsterLevel: config.baseLevel,
            monsterDamageMultiplier: 1.0,
            monsterHealthMultiplier: 1.0,
            eliteSpawnChancePercent: 1.0,
            isOvercrowded: false,
        };

        if (playerCount === 0) {
            return baseline;
        }

        let totalLevel = 0;
        for (const p of activePlayers) {
            totalLevel += p.level;
        }
        const averagePlayerLevel = totalLevel / playerCount;

        if (playerCount > config.densityThresholdSoft && averagePlayerLevel > config.baseLevel) {
            const crowdFactorRaw = (playerCount - config.densityThresholdSoft) / 
                                   (config.densityThresholdHard - config.densityThresholdSoft);
            const crowdFactor = Math.min(1.0, Math.max(0.0, crowdFactorRaw));

            const levelExceedanceRaw = (averagePlayerLevel - config.baseLevel) / 
                                       Math.max(1, (config.maxScalingLevel - config.baseLevel));
            const levelFactor = Math.min(1.0, Math.max(0.0, levelExceedanceRaw));

            const threatIntensity = (crowdFactor * 0.6) + (levelFactor * 0.4);

            const levelSpan = config.maxScalingLevel - config.baseLevel;
            baseline.scaledMonsterLevel = config.baseLevel + Math.floor(levelSpan * threatIntensity);

            baseline.monsterHealthMultiplier = Math.round((1.0 + (2.0 * threatIntensity)) * 100) / 100;
            baseline.monsterDamageMultiplier = Math.round((1.0 + (1.0 * threatIntensity)) * 100) / 100;

            baseline.eliteSpawnChancePercent = Math.round((1.0 + (14.0 * threatIntensity)) * 100) / 100;
            baseline.isOvercrowded = threatIntensity >= 0.50;
        }

        return baseline;
    }
}