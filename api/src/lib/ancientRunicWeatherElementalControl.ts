import crypto from "node:crypto";

/**
 * Ancient Runic Weather Elemental Control, Atmospheric Ritual & Sky Cataclysm Engine for OpenAO MMORPG.
 * Simulates weather monuments (Stormcaller Obelisk, Tempest Spire, Celestial Aegis Conduit),
 * atmospheric weather states (Clear Sky, Torrential Storm, Blizzard Freeze, Solar Scorch),
 * weather ritual channeling, elemental combat damage modifiers, and atmospheric essence upkeep.
 */

export type WeatherTowerType = "STORMCALLER_OBELISK" | "TEMPEST_SPIRE" | "CELESTIAL_AEGIS_CONDUIT";
export type AtmosphericWeatherState = "CLEAR_SKY" | "TORRENTIAL_STORM" | "BLIZZARD_FREEZE" | "SOLAR_SCORCH";
export type ElementalSpellType = "LIGHTNING_BOLT" | "FROST_NOVA" | "FIREBALL" | "WATER_HEAL";

export interface WeatherTowerData {
    towerType: WeatherTowerType;
    maxEssenceCapacity: number;
    effectiveRadiusTiles: number;
    essenceRegenPerMinute: number;
}

export interface WeatherStateEffect {
    state: AtmosphericWeatherState;
    description: string;
    lightningDamageBonusPercent: number;
    frostDamageBonusPercent: number;
    fireDamageBonusPercent: number;
    movementSpeedPenaltyPercent: number;
}

export interface ActiveWeatherTower {
    towerId: string;
    controllerPlayerId: string;
    towerType: WeatherTowerType;
    location: { x: number; y: number };
    currentEssence: number;
    maxEssence: number;
    activeWeather: AtmosphericWeatherState;
    remainingWeatherDurationSeconds: number;
    isFunctional: boolean;
}

export const TOWER_CATALOG: Record<WeatherTowerType, WeatherTowerData> = {
    STORMCALLER_OBELISK: { towerType: "STORMCALLER_OBELISK", maxEssenceCapacity: 100, effectiveRadiusTiles: 30, essenceRegenPerMinute: 10 },
    TEMPEST_SPIRE: { towerType: "TEMPEST_SPIRE", maxEssenceCapacity: 200, effectiveRadiusTiles: 45, essenceRegenPerMinute: 15 },
    CELESTIAL_AEGIS_CONDUIT: { towerType: "CELESTIAL_AEGIS_CONDUIT", maxEssenceCapacity: 350, effectiveRadiusTiles: 60, essenceRegenPerMinute: 25 },
};

export const WEATHER_EFFECTS: Record<AtmosphericWeatherState, WeatherStateEffect> = {
    CLEAR_SKY: { state: "CLEAR_SKY", description: "Calm and clear sky.", lightningDamageBonusPercent: 0, frostDamageBonusPercent: 0, fireDamageBonusPercent: 0, movementSpeedPenaltyPercent: 0 },
    TORRENTIAL_STORM: { state: "TORRENTIAL_STORM", description: "Heavy downpour and lightning surge.", lightningDamageBonusPercent: 40, frostDamageBonusPercent: 10, fireDamageBonusPercent: -20, movementSpeedPenaltyPercent: 15 },
    BLIZZARD_FREEZE: { state: "BLIZZARD_FREEZE", description: "Sub-zero blizzard and ice winds.", lightningDamageBonusPercent: 0, frostDamageBonusPercent: 35, fireDamageBonusPercent: -15, movementSpeedPenaltyPercent: 30 },
    SOLAR_SCORCH: { state: "SOLAR_SCORCH", description: "Scorching solar heatwave.", lightningDamageBonusPercent: -10, frostDamageBonusPercent: -30, fireDamageBonusPercent: 50, movementSpeedPenaltyPercent: 10 },
};

export class AncientRunicWeatherElementalControlEngine {
    public static readonly RITUAL_ESSENCE_COST = 40;

    /**
     * Constructs a weather control tower monument.
     */
    public static constructTower(
        controllerPlayerId: string,
        towerType: WeatherTowerType,
        locX = 0,
        locY = 0,
        currentEpochMs = Date.now()
    ): ActiveWeatherTower {
        const data = TOWER_CATALOG[towerType];
        if (!data) {
            throw new Error(`Unsupported weather tower type: ${String(towerType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            towerId: `tower_${towerType.toLowerCase()}_${uuid}`,
            controllerPlayerId,
            towerType,
            location: {
                x: Number.isFinite(locX) ? locX : 0,
                y: Number.isFinite(locY) ? locY : 0,
            },
            currentEssence: data.maxEssenceCapacity,
            maxEssence: data.maxEssenceCapacity,
            activeWeather: "CLEAR_SKY",
            remainingWeatherDurationSeconds: 0,
            isFunctional: true,
        };
    }

    /**
     * Channels an atmospheric weather ritual to change local weather.
     */
    public static channelWeatherRitual(
        tower: ActiveWeatherTower,
        targetWeather: AtmosphericWeatherState,
        durationSeconds = 120
    ): { success: boolean; activeWeather: AtmosphericWeatherState; remainingEssence: number; reason?: string } {
        if (!tower || !tower.isFunctional) {
            return { success: false, activeWeather: "CLEAR_SKY", remainingEssence: 0, reason: "Tower is non-functional or invalid." };
        }

        if (!WEATHER_EFFECTS[targetWeather]) {
            return { success: false, activeWeather: tower.activeWeather, remainingEssence: tower.currentEssence, reason: `Unknown weather state: ${String(targetWeather)}` };
        }

        if (tower.currentEssence < this.RITUAL_ESSENCE_COST) {
            return {
                success: false,
                activeWeather: tower.activeWeather,
                remainingEssence: tower.currentEssence,
                reason: `Insufficient essence (requires ${this.RITUAL_ESSENCE_COST}, has ${tower.currentEssence}).`,
            };
        }

        tower.currentEssence -= this.RITUAL_ESSENCE_COST;
        tower.activeWeather = targetWeather;
        tower.remainingWeatherDurationSeconds = Math.max(10, Number.isFinite(durationSeconds) ? durationSeconds : 120);

        return {
            success: true,
            activeWeather: tower.activeWeather,
            remainingEssence: tower.currentEssence,
        };
    }

    /**
     * Calculates elemental spell combat damage modified by active weather.
     */
    public static calculateModifiedSpellDamage(
        tower: ActiveWeatherTower,
        spellType: ElementalSpellType,
        baseDamage: number
    ): { finalDamage: number; appliedModifierPercent: number; weatherState: AtmosphericWeatherState } {
        const base = Number.isFinite(baseDamage) ? Math.max(1, baseDamage) : 100;
        const weather = tower?.activeWeather || "CLEAR_SKY";
        const effect = WEATHER_EFFECTS[weather] || WEATHER_EFFECTS.CLEAR_SKY;

        let modPercent = 0;
        if (spellType === "LIGHTNING_BOLT") {
            modPercent = effect.lightningDamageBonusPercent;
        } else if (spellType === "FROST_NOVA") {
            modPercent = effect.frostDamageBonusPercent;
        } else if (spellType === "FIREBALL") {
            modPercent = effect.fireDamageBonusPercent;
        }

        const multiplier = 1 + (modPercent / 100);
        const finalDmg = Math.max(1, Math.round(base * multiplier));

        return {
            finalDamage: finalDmg,
            appliedModifierPercent: modPercent,
            weatherState: weather,
        };
    }

    /**
     * Ticks weather duration and regenerates tower essence.
     */
    public static tickWeather(
        tower: ActiveWeatherTower,
        elapsedSeconds = 1
    ): { activeWeather: AtmosphericWeatherState; remainingSeconds: number; currentEssence: number } {
        if (!tower) return { activeWeather: "CLEAR_SKY", remainingSeconds: 0, currentEssence: 0 };

        const sec = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 1;

        if (tower.remainingWeatherDurationSeconds > 0) {
            tower.remainingWeatherDurationSeconds = Math.max(0, tower.remainingWeatherDurationSeconds - sec);
            if (tower.remainingWeatherDurationSeconds === 0) {
                tower.activeWeather = "CLEAR_SKY";
            }
        }

        const towerData = TOWER_CATALOG[tower.towerType];
        const regenPerMinute = towerData ? towerData.essenceRegenPerMinute : 0;
        const regenAmount = (regenPerMinute / 60) * sec;
        tower.currentEssence = Math.min(tower.maxEssence, tower.currentEssence + regenAmount);

        return {
            activeWeather: tower.activeWeather,
            remainingSeconds: tower.remainingWeatherDurationSeconds,
            currentEssence: tower.currentEssence,
        };
    }
}