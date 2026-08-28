import { describe, it, expect } from "vitest";
import { RegionalThreatEngine, ZoneConfiguration } from "../lib/regionalThreatEngine.js";

describe("RegionalThreatEngine Dynamic Zone Scaling", () => {
    const goblinCamp: ZoneConfiguration = {
        zoneId: "goblin_camp_01",
        baseLevel: 10,
        maxScalingLevel: 30,
        densityThresholdSoft: 5,
        densityThresholdHard: 20,
    };

    it("returns baseline stats for empty or sparsely populated zones", () => {
        const resEmpty = RegionalThreatEngine.evaluateZoneThreat(goblinCamp, []);
        expect(resEmpty.scaledMonsterLevel).toBe(10);
        expect(resEmpty.monsterHealthMultiplier).toBe(1.0);
        expect(resEmpty.eliteSpawnChancePercent).toBe(1.0);

        const players = [
            { playerId: "p1", level: 50 },
            { playerId: "p2", level: 50 },
            { playerId: "p3", level: 50 },
            { playerId: "p4", level: 50 },
        ];
        const resSparse = RegionalThreatEngine.evaluateZoneThreat(goblinCamp, players);
        expect(resSparse.scaledMonsterLevel).toBe(10);
        expect(resSparse.isOvercrowded).toBe(false);
    });

    it("scales threat up when high-level players overcrowd a low-level zone", () => {
        const players = Array.from({ length: 12 }).map((_, i) => ({
            playerId: `p${i}`,
            level: 30,
        }));

        const res = RegionalThreatEngine.evaluateZoneThreat(goblinCamp, players);
        expect(res.scaledMonsterLevel).toBeGreaterThan(10);
        expect(res.monsterHealthMultiplier).toBeGreaterThan(1.0);
        expect(res.isOvercrowded).toBe(true); // Threat intensity ~0.68 >= 0.50
    });

    it("validates configuration threshold integrity", () => {
        const badConfig: ZoneConfiguration = {
            ...goblinCamp,
            densityThresholdSoft: 10,
            densityThresholdHard: 10,
        };

        expect(() => {
            RegionalThreatEngine.evaluateZoneThreat(badConfig, [{ playerId: "p1", level: 20 }]);
        }).toThrow("densityThresholdHard must be strictly greater than densityThresholdSoft");
    });
});