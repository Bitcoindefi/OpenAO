import { describe, it, expect } from "vitest";
import { WeatherStateMachine } from "../lib/weatherStateMachine.js";

describe("WeatherStateMachine Climatology & Modifier Copy Isolation", () => {
    it("returns an immutable copy that prevents mutating constant effects", () => {
        const mods = WeatherStateMachine.getWeatherModifiers("CLEAR_SKY");
        mods.visibilityRangeTiles = 999; // Mutate local copy

        const freshMods = WeatherStateMachine.getWeatherModifiers("CLEAR_SKY");
        expect(freshMods.visibilityRangeTiles).toBe(20); // Constant preserved
    });

    it("handles boundary rng rolls cleanly", () => {
        // rng = 1.0 (boundary test)
        const weather = WeatherStateMachine.rollNextWeather("ARID_DESERT", () => 1.0);
        expect(weather).toBe("SANDSTORM");
    });
});