/**
 * 24-Hour Day/Night Solar Lighting Curve & Lunar Phase Engine for OpenAO MMORPG.
 * Simulates cubic smoothstep RGB ambient lighting, 8 lunar phases (+25% night vision bonus on full moon),
 * and dungeon/indoor ambient light overrides.
 */

export type MoonPhase =
    | "NEW_MOON"
    | "WAXING_CRESCENT"
    | "FIRST_QUARTER"
    | "WAXING_GIBBOUS"
    | "FULL_MOON"
    | "WANING_GIBBOUS"
    | "LAST_QUARTER"
    | "WANING_CRESCENT";

export interface RGBColor {
    r: number; // 0 to 255
    g: number; // 0 to 255
    b: number; // 0 to 255
}

export interface AmbientLightState {
    tick: number;
    hourOfDay: number; // 0.0 to 24.0
    color: RGBColor;
    intensity: number; // 0.0 to 1.0
    isNightTime: boolean;
    moonPhase: MoonPhase;
    playerNightVisionMultiplier: number;
}

export class DayNightCycleEngine {
    public static readonly TICKS_PER_DAY = 14400; // 14,400 ticks per in-game 24 hours (10 ticks/sec)
    public static readonly TICKS_PER_LUNAR_CYCLE = DayNightCycleEngine.TICKS_PER_DAY * 8; // 8 in-game days per full lunar cycle

    private static readonly COLOR_MIDNIGHT: RGBColor = { r: 15, g: 15, b: 45 };
    private static readonly COLOR_DAWN: RGBColor = { r: 230, g: 130, b: 90 };
    private static readonly COLOR_NOON: RGBColor = { r: 255, g: 255, b: 245 };
    private static readonly COLOR_DUSK: RGBColor = { r: 210, g: 90, b: 60 };

    /**
     * Performs cubic Hermite smoothstep interpolation between 0 and 1.
     */
    private static smoothstep(edge0: number, edge1: number, x: number): number {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    private static lerpRGB(a: RGBColor, b: RGBColor, t: number): RGBColor {
        return {
            r: Math.round(a.r + (b.r - a.r) * t),
            g: Math.round(a.g + (b.g - a.g) * t),
            b: Math.round(a.b + (b.b - a.b) * t),
        };
    }

    /**
     * Resolves the current lunar phase from total accumulated game ticks.
     */
    public static getMoonPhase(totalTicks: number): MoonPhase {
        const cycleProgress = (totalTicks % this.TICKS_PER_LUNAR_CYCLE) / this.TICKS_PER_LUNAR_CYCLE;
        const phaseIndex = Math.floor(cycleProgress * 8);

        const phases: MoonPhase[] = [
            "NEW_MOON",
            "WAXING_CRESCENT",
            "FIRST_QUARTER",
            "WAXING_GIBBOUS",
            "FULL_MOON",
            "WANING_GIBBOUS",
            "LAST_QUARTER",
            "WANING_CRESCENT",
        ];

        return phases[phaseIndex] || "NEW_MOON";
    }

    /**
     * Computes the ambient lighting and lunar parameters for a given tick.
     */
    public static calculateAmbientLighting(
        totalTicks: number,
        isIndoorOrDungeon: boolean = false
    ): AmbientLightState {
        if (isIndoorOrDungeon) {
            return {
                tick: totalTicks % this.TICKS_PER_DAY,
                hourOfDay: 12.0,
                color: { r: 180, g: 170, b: 150 }, // Warm dungeon torch ambient
                intensity: 0.70,
                isNightTime: false,
                moonPhase: "NEW_MOON",
                playerNightVisionMultiplier: 1.0,
            };
        }

        const dayTick = totalTicks % this.TICKS_PER_DAY;
        const hourOfDay = (dayTick / this.TICKS_PER_DAY) * 24.0;
        const moonPhase = this.getMoonPhase(totalTicks);

        let color: RGBColor;
        let intensity: number;
        let isNightTime = false;

        // Hour intervals:
        // 0-4: Midnight, 4-6: Dawn transition, 6-12: Noon transition, 12-18: Noon, 18-20: Dusk, 20-24: Midnight
        if (hourOfDay >= 0 && hourOfDay < 4) {
            color = this.COLOR_MIDNIGHT;
            intensity = 0.20;
            isNightTime = true;
        } else if (hourOfDay >= 4 && hourOfDay < 6) {
            const t = this.smoothstep(4, 6, hourOfDay);
            color = this.lerpRGB(this.COLOR_MIDNIGHT, this.COLOR_DAWN, t);
            intensity = 0.20 + 0.50 * t;
            isNightTime = t < 0.5;
        } else if (hourOfDay >= 6 && hourOfDay < 12) {
            const t = this.smoothstep(6, 12, hourOfDay);
            color = this.lerpRGB(this.COLOR_DAWN, this.COLOR_NOON, t);
            intensity = 0.70 + 0.30 * t;
            isNightTime = false;
        } else if (hourOfDay >= 12 && hourOfDay < 18) {
            color = this.COLOR_NOON;
            intensity = 1.0;
            isNightTime = false;
        } else if (hourOfDay >= 18 && hourOfDay < 20) {
            const t = this.smoothstep(18, 20, hourOfDay);
            color = this.lerpRGB(this.COLOR_NOON, this.COLOR_DUSK, t);
            intensity = 1.0 - 0.40 * t;
            isNightTime = t > 0.5;
        } else {
            const t = this.smoothstep(20, 24, hourOfDay);
            color = this.lerpRGB(this.COLOR_DUSK, this.COLOR_MIDNIGHT, t);
            intensity = 0.60 - 0.40 * t;
            isNightTime = true;
        }

        // Night vision bonus: +25% bonus on Full Moon night
        let nightVisionMultiplier = 1.0;
        if (isNightTime && moonPhase === "FULL_MOON") {
            nightVisionMultiplier = 1.25;
        }

        return {
            tick: dayTick,
            hourOfDay: Math.round(hourOfDay * 100) / 100,
            color,
            intensity: Math.round(intensity * 100) / 100,
            isNightTime,
            moonPhase,
            playerNightVisionMultiplier: nightVisionMultiplier,
        };
    }
}