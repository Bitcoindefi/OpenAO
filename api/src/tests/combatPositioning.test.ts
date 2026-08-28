import { describe, it, expect } from "vitest";
import { CombatPositioningEngine, CombatEntityPosition } from "../lib/combatPositioning.js";

describe("CombatPositioningEngine Spatial Cones and Angle Normalization", () => {
    // Defender at (10, 10) facing North with negative/out-of-range radian value (-3*PI/2 = +PI/2 = 90 deg)
    const defender: CombatEntityPosition = {
        x: 10,
        y: 10,
        facingAngleRad: -3 * Math.PI / 2, // Normalized to PI/2 (North)
    };

    it("detects BACKSTAB attack even with un-normalized facing angle", () => {
        // Attacker is directly South of defender at (10, 5)
        const southAttacker: CombatEntityPosition = { x: 10, y: 5, facingAngleRad: 0 };
        const mods = CombatPositioningEngine.computePositionalModifiers(southAttacker, defender);

        expect(mods.sector).toBe("BACKSTAB");
        expect(mods.damageMultiplier).toBe(1.40);
        expect(mods.criticalChanceBonusPercent).toBe(25.0);
        expect(mods.defenderParryBlockBonusPercent).toBe(-100.0);
    });

    it("detects FLANK attack and verifies -25% defender parry/block penalty", () => {
        // Attacker is East of defender at (15, 10)
        const eastAttacker: CombatEntityPosition = { x: 15, y: 10, facingAngleRad: Math.PI };
        const mods = CombatPositioningEngine.computePositionalModifiers(eastAttacker, defender);

        expect(mods.sector).toBe("FLANK");
        expect(mods.damageMultiplier).toBe(1.15);
        expect(mods.defenderParryBlockBonusPercent).toBe(-25.0);
    });

    it("safely handles coincident coordinates as FRONTAL with +15% block bonus", () => {
        const stackedAttacker: CombatEntityPosition = { x: 10, y: 10, facingAngleRad: 0 };
        const mods = CombatPositioningEngine.computePositionalModifiers(stackedAttacker, defender);

        expect(mods.sector).toBe("FRONTAL");
        expect(mods.damageMultiplier).toBe(1.0);
        expect(mods.defenderParryBlockBonusPercent).toBe(15.0);
    });
});