import { describe, it, expect } from "vitest";
import {
    ChronoTemporalDilationEngine,
    PlayerChronoState,
} from "../lib/chronoTemporalDilation.js";

describe("ChronoTemporalDilationEngine Temporal Spells & Paradox Backlash", () => {
    it("casts TIME_WARP and accelerates cooldown rate by 1.5x", () => {
        const mage: PlayerChronoState = {
            playerId: "chrono_mage_1",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        const castRes = ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 10, 100000);
        expect(castRes.success).toBe(true);
        expect(castRes.effect?.spellType).toBe("TIME_WARP");

        const cdMultiplier = ChronoTemporalDilationEngine.calculateCooldownMultiplier(mage);
        expect(cdMultiplier).toBe(1.5);
    });

    it("locks target in CHRONO_STASIS without locking the caster", () => {
        const caster: PlayerChronoState = {
            playerId: "caster_mage",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        const enemy: PlayerChronoState = {
            playerId: "enemy_boss",
            currentHp: 5000,
            maxHp: 5000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        ChronoTemporalDilationEngine.castChronoSpell(caster, enemy, "CHRONO_STASIS", 5, 100000);

        // Enemy is locked in stasis
        expect(enemy.isStasisLocked).toBe(true);
        expect(ChronoTemporalDilationEngine.calculateCooldownMultiplier(enemy)).toBe(0);

        // Caster is NOT locked in stasis
        ChronoTemporalDilationEngine.cleanseExpiredEffects(caster, 100500);
        expect(caster.isStasisLocked).toBe(false);
        expect(ChronoTemporalDilationEngine.calculateCooldownMultiplier(caster)).toBe(1.0);
    });

    it("rewinds health to state 5 seconds prior with REWIND_FATE across multiple snapshots", () => {
        const mage: PlayerChronoState = {
            playerId: "chrono_mage_1",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        // Snapshot full health at 100000
        ChronoTemporalDilationEngine.recordHealthSnapshot(mage, 100000);

        // Simulate 15 rapid casts within 5 seconds without evicting the snapshot
        for (let i = 1; i <= 15; i++) {
            mage.currentHp = 1000 - i * 40;
            ChronoTemporalDilationEngine.recordHealthSnapshot(mage, 100000 + i * 200);
        }

        // At 105500, mage has 400 HP
        expect(mage.currentHp).toBe(400);

        // Casts Rewind Fate at 105500 -> Restores to snapshot from <= 100500 (920 HP at i=2, 100400ms)
        const rewindRes = ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "REWIND_FATE", 5, 105500);
        expect(rewindRes.success).toBe(true);
        expect(mage.currentHp).toBe(920);
    });

    it("triggers Temporal Paradox Backlash when stacking too many spells", () => {
        const mage: PlayerChronoState = {
            playerId: "reckless_mage",
            currentHp: 1000,
            maxHp: 1000,
            healthSnapshots: [],
            activeEffects: [],
            isStasisLocked: false,
        };

        ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);
        ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);
        ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);

        const paradoxRes = ChronoTemporalDilationEngine.castChronoSpell(mage, mage, "TIME_WARP", 20, 100000);
        expect(paradoxRes.success).toBe(false);
        expect(paradoxRes.isParadoxTriggered).toBe(true);
        expect(paradoxRes.paradoxDamageDealt).toBe(350);
        expect(mage.currentHp).toBe(650);
    });
});