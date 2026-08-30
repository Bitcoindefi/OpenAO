import { describe, it, expect } from "vitest";
import {
    AncientRunicChronoStasisEngine,
    ActiveTimeDilationField,
    ChronoCombatEntity,
} from "../lib/ancientRunicChronoStasis.js";

describe("AncientRunicChronoStasisEngine Time-Dilation & Stasis", () => {
    it("deploys Singularity Temporal Core and applies Temporal Haste to allies and Chrono Stasis to enemies in radius", () => {
        const field = AncientRunicChronoStasisEngine.deployTemporalField("mage_01", "SINGULARITY_TEMPORAL_CORE", 50, 50, 100000);
        expect(field.fieldRadiusTiles).toBe(16);
        expect(field.remainingLifespanSeconds).toBe(60);

        const ally: ChronoCombatEntity = { entityId: "ally_01", isFriendlyToCaster: true, location: { x: 55, y: 50 }, isAlive: true, activeChronoEffects: [] };
        const enemyNear: ChronoCombatEntity = { entityId: "enemy_01", isFriendlyToCaster: false, location: { x: 60, y: 50 }, isAlive: true, activeChronoEffects: [] };
        const enemyFar: ChronoCombatEntity = { entityId: "enemy_far", isFriendlyToCaster: false, location: { x: 90, y: 50 }, isAlive: true, activeChronoEffects: [] };

        const pulseRes = AncientRunicChronoStasisEngine.pulseTemporalField(field, [ally, enemyNear, enemyFar]);
        expect(pulseRes.success).toBe(true);
        expect(pulseRes.affectedCount).toBe(2);
        expect(pulseRes.hasteAppliedCount).toBe(1);
        expect(pulseRes.stasisAppliedCount).toBe(1);

        expect(ally.activeChronoEffects).toContain("TEMPORAL_HASTE_50");
        expect(enemyNear.activeChronoEffects).toContain("CHRONO_STASIS_LOCK");
        expect(enemyFar.activeChronoEffects).toEqual([]);
    });

    it("clears stale chrono auras from entities that die", () => {
        const field = AncientRunicChronoStasisEngine.deployTemporalField("m", "CHRONO_HOURGLASS", 0, 0, 100000);
        const dyingEntity: ChronoCombatEntity = { entityId: "dying", isFriendlyToCaster: false, location: { x: 2, y: 2 }, isAlive: true, activeChronoEffects: [] };

        AncientRunicChronoStasisEngine.pulseTemporalField(field, [dyingEntity]);
        expect(dyingEntity.activeChronoEffects).toContain("CHRONO_STASIS_LOCK");

        // Entity dies
        dyingEntity.isAlive = false;
        AncientRunicChronoStasisEngine.pulseTemporalField(field, [dyingEntity]);
        expect(dyingEntity.activeChronoEffects).toEqual([]); // Cleared upon death
    });

    it("ticks field lifespan, consumes caster mana upkeep, and collapses on mana starvation", () => {
        const field = AncientRunicChronoStasisEngine.deployTemporalField("m", "CHRONO_HOURGLASS", 0, 0, 100000); // 10 mana/sec

        // Tick 5 seconds with 100 mana -> 50 mana consumed, 50 remaining
        const tick1 = AncientRunicChronoStasisEngine.tickFieldLifespan(field, 5, 100);
        expect(tick1.remainingSeconds).toBe(25);
        expect(tick1.remainingMana).toBe(50);
        expect(tick1.isCollapsed).toBe(false);

        // Tick next 10 seconds with only 50 mana (requires 100 mana) -> Collapses due to mana starvation
        const tick2 = AncientRunicChronoStasisEngine.tickFieldLifespan(field, 10, 50);
        expect(tick2.isCollapsed).toBe(true);
        expect(tick2.collapseReason).toContain("Mana starvation");
        expect(field.isActive).toBe(false);
    });

    it("guards against dead entities and unsupported device models", () => {
        expect(() => AncientRunicChronoStasisEngine.deployTemporalField("m", "QUANTUM_TOASTER" as any)).toThrow(
            "Unsupported chrono device"
        );

        const field = AncientRunicChronoStasisEngine.deployTemporalField("m", "CHRONO_HOURGLASS", 0, 0);
        const deadAlly: ChronoCombatEntity = { entityId: "dead", isFriendlyToCaster: true, location: { x: 1, y: 1 }, isAlive: false, activeChronoEffects: [] };

        const pulse = AncientRunicChronoStasisEngine.pulseTemporalField(field, [deadAlly]);
        expect(pulse.affectedCount).toBe(0);
    });

    it("guards against null/undefined fields and invalid inputs", () => {
        expect(AncientRunicChronoStasisEngine.pulseTemporalField(null as any, []).success).toBe(false);
        expect(AncientRunicChronoStasisEngine.tickFieldLifespan(null as any).success).toBe(false);
    });
});