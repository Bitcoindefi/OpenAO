import { describe, it, expect } from "vitest";
import {
    AstronomyConstellationStargazingEngine,
    TelescopeObservationSession,
} from "../lib/astronomyConstellationStargazing.js";

describe("AstronomyConstellationStargazingEngine Charting & Lunar Blessings", () => {
    it("starts stargazing session and successfully charts THE_DRAGON in the NORTH quadrant", () => {
        const session = AstronomyConstellationStargazingEngine.startObservationSession("astronomer_1", "THE_DRAGON", 100000);
        expect(session.starsMappedCount).toBe(0);
        expect(session.requiredStarsCount).toBe(5);

        for (let i = 0; i < 4; i++) {
            const mapRes = AstronomyConstellationStargazingEngine.mapStar(session, "NORTH");
            expect(mapRes.success).toBe(true);
        }

        const finalStar = AstronomyConstellationStargazingEngine.mapStar(session, "NORTH");
        expect(finalStar.success).toBe(true);
        expect(finalStar.isCompleted).toBe(true);
        expect(session.isFullyCharted).toBe(true);
    });

    it("rejects star mapping when telescope is aimed at the wrong quadrant", () => {
        const session = AstronomyConstellationStargazingEngine.startObservationSession("astronomer_1", "THE_PHOENIX", 100000);

        // Phoenix is in SOUTH, aimed at NORTH
        const misaligned = AstronomyConstellationStargazingEngine.mapStar(session, "NORTH");
        expect(misaligned.success).toBe(false);
        expect(misaligned.reason).toContain("aimed at NORTH, but THE_PHOENIX is located in the SOUTH");
    });

    it("channels celestial blessing under FULL_MOON applying 2.0x lunar multiplier", () => {
        const session = AstronomyConstellationStargazingEngine.startObservationSession("astronomer_1", "THE_TITAN", 100000);
        session.starsMappedCount = 6;
        session.isFullyCharted = true;

        // Titan base 60 bonus * 2.0 Full Moon = 120 stat bonus
        const blessRes = AstronomyConstellationStargazingEngine.channelCelestialBlessing(session, "FULL_MOON", 20, 100000);
        expect(blessRes.success).toBe(true);
        expect(blessRes.blessing?.bonusStatValue).toBe(120);
        expect(blessRes.blessing?.durationSeconds).toBe(1200); // 20 mins * 60s
    });

    it("rejects blessing channel when chart is incomplete", () => {
        const incompleteSession = AstronomyConstellationStargazingEngine.startObservationSession("p", "THE_VOID_WEAVER", 100000);
        const res = AstronomyConstellationStargazingEngine.channelCelestialBlessing(incompleteSession, "NEW_MOON");

        expect(res.success).toBe(false);
        expect(res.reason).toContain("incomplete constellation chart");
    });

    it("guards against unsupported constellation types", () => {
        expect(() => AstronomyConstellationStargazingEngine.startObservationSession("p", "THE_UNICORN" as any)).toThrow(
            "Unsupported constellation"
        );
    });
});