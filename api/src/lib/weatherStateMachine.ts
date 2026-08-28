/**
 * Dynamic Weather State Machine & Biome Climatology Engine for OpenAO MMORPG.
 * Simulates regional weather transitions, environmental hazard effects (lightning strikes, visibility reduction),
 * and elemental spell damage modifiers with immutable state protection.
 */

export type WeatherType = "CLEAR_SKY" | "LIGHT_RAIN" | "THUNDERSTORM" | "DENSE_FOG" | "BLIZZARD" | "SANDSTORM";
export type BiomeType = "TEMPERATE_FOREST" | "ARID_DESERT" | "FROZEN_TUNDRA" | "MURKY_SWAMP" | "OCEAN";

export interface WeatherModifiers {
    movementSpeedMultiplier: number;
    visibilityRangeTiles: number;
    fireSpellMultiplier: number;
    waterSpellMultiplier: number;
    lightningSpellMultiplier: number;
    lightningStrikeChancePerTick: number;
}

export const WEATHER_EFFECTS: Record<WeatherType, WeatherModifiers> = {
    CLEAR_SKY: {
        movementSpeedMultiplier: 1.0,
        visibilityRangeTiles: 20,
        fireSpellMultiplier: 1.0,
        waterSpellMultiplier: 1.0,
        lightningSpellMultiplier: 1.0,
        lightningStrikeChancePerTick: 0.0,
    },
    LIGHT_RAIN: {
        movementSpeedMultiplier: 0.95,
        visibilityRangeTiles: 16,
        fireSpellMultiplier: 0.85,
        waterSpellMultiplier: 1.15,
        lightningSpellMultiplier: 1.10,
        lightningStrikeChancePerTick: 0.0,
    },
    THUNDERSTORM: {
        movementSpeedMultiplier: 0.90,
        visibilityRangeTiles: 12,
        fireSpellMultiplier: 0.70,
        waterSpellMultiplier: 1.25,
        lightningSpellMultiplier: 1.30,
        lightningStrikeChancePerTick: 0.02,
    },
    DENSE_FOG: {
        movementSpeedMultiplier: 0.95,
        visibilityRangeTiles: 6,
        fireSpellMultiplier: 1.0,
        waterSpellMultiplier: 1.05,
        lightningSpellMultiplier: 1.0,
        lightningStrikeChancePerTick: 0.0,
    },
    BLIZZARD: {
        movementSpeedMultiplier: 0.75,
        visibilityRangeTiles: 8,
        fireSpellMultiplier: 0.80,
        waterSpellMultiplier: 1.10,
        lightningSpellMultiplier: 0.90,
        lightningStrikeChancePerTick: 0.0,
    },
    SANDSTORM: {
        movementSpeedMultiplier: 0.80,
        visibilityRangeTiles: 7,
        fireSpellMultiplier: 1.10,
        waterSpellMultiplier: 0.75,
        lightningSpellMultiplier: 1.0,
        lightningStrikeChancePerTick: 0.0,
    },
};

export const BIOME_WEATHER_WEIGHTS: Record<BiomeType, Record<WeatherType, number>> = {
    TEMPERATE_FOREST: { CLEAR_SKY: 50, LIGHT_RAIN: 30, THUNDERSTORM: 15, DENSE_FOG: 5, BLIZZARD: 0, SANDSTORM: 0 },
    ARID_DESERT: { CLEAR_SKY: 70, LIGHT_RAIN: 5, THUNDERSTORM: 0, DENSE_FOG: 0, BLIZZARD: 0, SANDSTORM: 25 },
    FROZEN_TUNDRA: { CLEAR_SKY: 40, LIGHT_RAIN: 0, THUNDERSTORM: 0, DENSE_FOG: 10, BLIZZARD: 50, SANDSTORM: 0 },
    MURKY_SWAMP: { CLEAR_SKY: 20, LIGHT_RAIN: 40, THUNDERSTORM: 20, DENSE_FOG: 20, BLIZZARD: 0, SANDSTORM: 0 },
    OCEAN: { CLEAR_SKY: 35, LIGHT_RAIN: 30, THUNDERSTORM: 25, DENSE_FOG: 10, BLIZZARD: 0, SANDSTORM: 0 },
};

export class WeatherStateMachine {
    /**
     * Determines the next weather state for a biome based on weighted climatology.
     */
    public static rollNextWeather(biome: BiomeType, rng: () => number = Math.random): WeatherType {
        const weights = BIOME_WEATHER_WEIGHTS[biome] || BIOME_WEATHER_WEIGHTS.TEMPERATE_FOREST;
        let totalWeight = 0;

        for (const w of Object.values(weights)) {
            totalWeight += w;
        }

        const safeRng = Math.min(0.99999, Math.max(0.0, rng()));
        let roll = safeRng * totalWeight;

        for (const [weatherStr, weight] of Object.entries(weights)) {
            if (roll < weight) {
                return weatherStr as WeatherType;
            }
            roll -= weight;
        }

        return "CLEAR_SKY";
    }

    /**
     * Retrieves an immutable copy of gameplay modifiers associated with a weather condition.
     */
    public static getWeatherModifiers(weather: WeatherType): WeatherModifiers {
        const effect = WEATHER_EFFECTS[weather] || WEATHER_EFFECTS.CLEAR_SKY;
        return { ...effect }; // Return shallow clone to prevent caller mutation of constant
    }
}