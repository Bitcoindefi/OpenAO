import { describe, it, expect } from "vitest";
import { DayNightCycleEngine } from "../lib/dayNightCycle.js";

describe("DayNightCycleEngine Solar Lighting and Lunar Phases", () => {
    it("renders full daylight and max intensity at solar noon", () => {
        // Noon is at 50% of the day: tick 7200 out of 14400
        const noon = DayNightCycleEngine.calculateAmbientLighting(7200);
        expect(noon.hourOfDay).toBe(12.0);
        expect(noon.isNightTime).toBe(false);
        expect(noon.intensity).toBe(1.0);
        expect(noon.color.r).toBe(255);
    });

    it("renders dark blue tint and low intensity at midnight", () => {
        // Midnight at tick 0
        const midnight = DayNightCycleEngine.calculateAmbientLighting(0);
        expect(midnight.hourOfDay).toBe(0.0);
        expect(midnight.isNightTime).toBe(true);
        expect(midnight.intensity).toBe(0.20);
        expect(midnight.color.b).toBeGreaterThan(midnight.color.r);
    });

    it("grants +25% night vision bonus during Full Moon nights", () => {
        // Full Moon occurs at tick offset 4 * 14400 (day 4 out of 8 in lunar cycle)
        const fullMoonMidnightTicks = 4 * 14400; // Midnight of day 4
        const res = DayNightCycleEngine.calculateAmbientLighting(fullMoonMidnightTicks);

        expect(res.moonPhase).toBe("FULL_MOON");
        expect(res.isNightTime).toBe(true);
        expect(res.playerNightVisionMultiplier).toBe(1.25);
    });

    it("overrides ambient lighting inside dungeon interiors", () => {
        const dungeon = DayNightCycleEngine.calculateAmbientLighting(0, true);
        expect(dungeon.intensity).toBe(0.70);
        expect(dungeon.isNightTime).toBe(false);
    });
});