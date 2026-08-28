/**
 * Dynamic Weather State Machine Engine for OpenAO MMORPG.
 * Simulates atmospheric state transitions, biome climatology tables,
 * visibility attenuation, and gameplay modifiers.
 */

export type WeatherType = "SUNNY" | "CLOUDY" | "LIGHT_RAIN" | "HEAVY_STORM" | "FOGGY" | "SNOWING";
export type BiomeType = "TEMPERATE_FOREST" | "DESERT" | "TUNDRA" | "SWAMP" | "OCEAN";

export interface WeatherState {
    current: WeatherType;
    previous: WeatherType;
    transitionProgress: number; // 0.0 to 1.0
    ticksRemainingInState: number;
    intensity: number; // 0.0 to 1.0
    visibilityFactor: number; // 0.0 (blind) to 1.0 (clear)
    lightningChancePerTick: number;
    movementSpeedMultiplier: number;
    elementalSpellModifiers: {
        fireDamageMult: number;
        waterDamageMult: number;
        lightningDamageMult: number;
    };
}

export interface BiomeWeatherProbabilities {
    [key: string]: number; // weight of transitioning to this weather
}

export const BIOME_WEATHER_TABLES: Record<BiomeType, Record<WeatherType, number>> = {
    TEMPERATE_FOREST: {
        SUNNY: 40,
        CLOUDY: 30,
        LIGHT_RAIN: 20,
        HEAVY_STORM: 5,
        FOGGY: 5,
        SNOWING: 0,
    },
    DESERT: {
        SUNNY: 85,
        CLOUDY: 12,
        LIGHT_RAIN: 2,
        HEAVY_STORM: 1,
        FOGGY: 0,
        SNOWING: 0,
    },
    TUNDRA: {
        SUNNY: 20,
        CLOUDY: 30,
        LIGHT_RAIN: 0,
        HEAVY_STORM: 0,
        FOGGY: 10,
        SNOWING: 40,
    },
    SWAMP: {
        SUNNY: 15,
        CLOUDY: 25,
        LIGHT_RAIN: 30,
        HEAVY_STORM: 10,
        FOGGY: 20,
        SNOWING: 0,
    },
    OCEAN: {
        SUNNY: 30,
        CLOUDY: 30,
        LIGHT_RAIN: 20,
        HEAVY_STORM: 15,
        FOGGY: 5,
        SNOWING: 0,
    },
};

export class WeatherStateMachine {
    private state: WeatherState;
    private biome: BiomeType;
    private minStateDurationTicks: number;
    private maxStateDurationTicks: number;

    constructor(
        initialBiome: BiomeType = "TEMPERATE_FOREST",
        initialWeather: WeatherType = "SUNNY",
        minDuration = 300,
        maxDuration = 1200
    ) {
        this.biome = initialBiome;
        this.minStateDurationTicks = minDuration;
        this.maxStateDurationTicks = maxDuration;
        this.state = this.buildWeatherState(initialWeather, initialWeather, 1.0, minDuration);
    }

    private buildWeatherState(
        current: WeatherType,
        previous: WeatherType,
        progress: number,
        duration: number
    ): WeatherState {
        let visibility = 1.0;
        let lightning = 0;
        let speedMult = 1.0;
        let fire = 1.0;
        let water = 1.0;
        let lightningDmg = 1.0;
        let intensity = 1.0;

        switch (current) {
            case "SUNNY":
                visibility = 1.0;
                fire = 1.1;
                water = 0.95;
                break;
            case "CLOUDY":
                visibility = 0.9;
                break;
            case "LIGHT_RAIN":
                visibility = 0.75;
                water = 1.15;
                fire = 0.85;
                break;
            case "HEAVY_STORM":
                visibility = 0.5;
                lightning = 0.05;
                speedMult = 0.9;
                water = 1.3;
                fire = 0.7;
                lightningDmg = 1.25;
                break;
            case "FOGGY":
                visibility = 0.35;
                break;
            case "SNOWING":
                visibility = 0.6;
                speedMult = 0.85;
                fire = 0.8;
                break;
        }

        return {
            current,
            previous,
            transitionProgress: progress,
            ticksRemainingInState: duration,
            intensity,
            visibilityFactor: visibility,
            lightningChancePerTick: lightning,
            movementSpeedMultiplier: speedMult,
            elementalSpellModifiers: {
                fireDamageMult: fire,
                waterDamageMult: water,
                lightningDamageMult: lightningDmg,
            },
        };
    }

    public getState(): Readonly<WeatherState> {
        return this.state;
    }

    public setBiome(biome: BiomeType): void {
        this.biome = biome;
    }

    private pickNextWeather(): WeatherType {
        const weights = BIOME_WEATHER_TABLES[this.biome];
        let totalWeight = 0;
        for (const w of Object.values(weights)) totalWeight += w;

        let rand = Math.random() * totalWeight;
        for (const [weather, weight] of Object.entries(weights)) {
            if (rand < weight) {
                return weather as WeatherType;
            }
            rand -= weight;
        }

        return "SUNNY";
    }

    public tick(): WeatherState {
        this.state.ticksRemainingInState--;

        if (this.state.ticksRemainingInState <= 0) {
            const nextWeather = this.pickNextWeather();
            const duration = Math.floor(
                this.minStateDurationTicks +
                Math.random() * (this.maxStateDurationTicks - this.minStateDurationTicks)
            );
            this.state = this.buildWeatherState(nextWeather, this.state.current, 1.0, duration);
        }

        return this.state;
    }
}