import { describe, it, expect } from "vitest";
import {
    SiegeCatapultBombardmentEngine,
    ActiveSiegeEngine,
    CastleFortification,
} from "../lib/siegeCatapultBombardment.js";

describe("SiegeCatapultBombardmentEngine Siege Engines, Ballistics & Castle Breaching", () => {
    it("deploys Heavy Trebuchet and fires Corrosive Flask within range", () => {
        const trebuchet = SiegeCatapultBombardmentEngine.deploySiegeEngine("engineer_01", "HEAVY_TREBUCHET", 100, 100, 100000);
        expect(trebuchet.engineType).toBe("HEAVY_TREBUCHET");
        expect(trebuchet.currentDurabilityHp).toBe(1500);

        const outerGate: CastleFortification = {
            structureId: "gate_01",
            structureType: "OUTER_GATE",
            location: { x: 130, y: 100 },
            currentHp: 2500,
            maxHp: 2500,
            armorRating: 0,
            isBreached: false,
        };

        const fireRes = SiegeCatapultBombardmentEngine.fireBombardment(trebuchet, outerGate, "CORROSIVE_ALCHEMICAL_FLASK", 100000);
        expect(fireRes.success).toBe(true);
        expect(fireRes.damageDealt).toBe(900);
        expect(outerGate.currentHp).toBe(1600);
        expect(fireRes.isBreached).toBe(false);
    });

    it("enforces reload time cooldowns between successive volleys", () => {
        const catapult = SiegeCatapultBombardmentEngine.deploySiegeEngine("engineer_02", "MANGANEL_CATAPULT", 0, 0, 100000);
        const wall: CastleFortification = {
            structureId: "wall_01",
            structureType: "FORTIFIED_RAMPART",
            location: { x: 20, y: 0 },
            currentHp: 5000,
            maxHp: 5000,
            armorRating: 25,
            isBreached: false,
        };

        const shot1 = SiegeCatapultBombardmentEngine.fireBombardment(catapult, wall, "BATTERING_BOULDER", 100000);
        expect(shot1.success).toBe(true);

        const prematureShot = SiegeCatapultBombardmentEngine.fireBombardment(catapult, wall, "BATTERING_BOULDER", 102000);
        expect(prematureShot.success).toBe(false);
        expect(prematureShot.reason).toContain("reloading");

        const validShot = SiegeCatapultBombardmentEngine.fireBombardment(catapult, wall, "BATTERING_BOULDER", 107000);
        expect(validShot.success).toBe(true);
    });

    it("breaches fortification when HP drops to 0 and blocks subsequent shots", () => {
        const trebuchet = SiegeCatapultBombardmentEngine.deploySiegeEngine("eng", "HEAVY_TREBUCHET", 0, 0, 100000);
        const weakGate: CastleFortification = {
            structureId: "g_01",
            structureType: "OUTER_GATE",
            location: { x: 10, y: 0 },
            currentHp: 500,
            maxHp: 2500,
            armorRating: 0,
            isBreached: false,
        };

        const fatalShot = SiegeCatapultBombardmentEngine.fireBombardment(trebuchet, weakGate, "BATTERING_BOULDER", 100000);
        expect(fatalShot.isBreached).toBe(true);
        expect(weakGate.isBreached).toBe(true);
        expect(weakGate.currentHp).toBe(0);

        const overShot = SiegeCatapultBombardmentEngine.fireBombardment(trebuchet, weakGate, "BATTERING_BOULDER", 120000);
        expect(overShot.success).toBe(false);
        expect(overShot.reason).toContain("already breached");
        expect(overShot.isBreached).toBe(true);

        // Null target reports isBreached: false
        const nullShot = SiegeCatapultBombardmentEngine.fireBombardment(trebuchet, null as any, "BATTERING_BOULDER", 140000);
        expect(nullShot.success).toBe(false);
        expect(nullShot.isBreached).toBe(false);
        expect(nullShot.reason).toContain("Target fortification is invalid");
    });

    it("rejects firing at targets beyond max range", () => {
        const ballista = SiegeCatapultBombardmentEngine.deploySiegeEngine("e", "BALLISTA_SIEGE_BOW", 0, 0, 100000);
        const distantWall: CastleFortification = {
            structureId: "w_far",
            structureType: "FORTIFIED_RAMPART",
            location: { x: 50, y: 0 },
            currentHp: 3000,
            maxHp: 3000,
            armorRating: 0,
            isBreached: false,
        };

        const outOfRange = SiegeCatapultBombardmentEngine.fireBombardment(ballista, distantWall, "BATTERING_BOULDER", 100000);
        expect(outOfRange.success).toBe(false);
        expect(outOfRange.reason).toContain("out of range");
    });

    it("guards against unsupported siege engine types", () => {
        expect(() => SiegeCatapultBombardmentEngine.deploySiegeEngine("e", "LASER_CANNON" as any, 0, 0)).toThrow(
            "Unsupported siege engine type"
        );
    });
});