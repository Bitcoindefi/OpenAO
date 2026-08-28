import { describe, it, expect } from "vitest";
import { CombatMitigationEngine, CombatAttackerStats, CombatDefenderStats } from "../lib/combatMitigation.js";

describe("CombatMitigationEngine Armor Penetration and Elemental Mitigations", () => {
    const baseAttacker: CombatAttackerStats = {
        attackPower: 100,
        flatArmorPenetration: 0,
        percentArmorPenetration: 0,
        criticalMultiplier: 1.5,
        isCriticalStrike: false,
    };

    const baseDefender: CombatDefenderStats = {
        armor: 100, // 100 armor = 50% physical damage reduction (100 / (100+100))
        fireResistancePercent: 0.30,
        waterResistancePercent: 0.0,
        earthResistancePercent: 0.0,
        flatDamageReduction: 0,
    };

    it("mitigates physical damage using asymptotic armor formula", () => {
        const res = CombatMitigationEngine.calculateDamage("PHYSICAL", baseAttacker, baseDefender);
        expect(res.effectiveArmor).toBe(100);
        expect(res.armorDeduction).toBe(50);
        expect(res.mitigatedDamage).toBe(50);
    });

    it("reduces effective armor via flat and percentage armor penetration", () => {
        const penAttacker: CombatAttackerStats = {
            ...baseAttacker,
            flatArmorPenetration: 20, // 100 - 20 = 80
            percentArmorPenetration: 0.50, // 80 * 50% = 40 effective armor
        };

        const res = CombatMitigationEngine.calculateDamage("PHYSICAL", penAttacker, baseDefender);
        expect(res.effectiveArmor).toBe(40);
        // 40 armor = 40 / 140 = ~28.57% reduction -> 100 * 28.57% = 29 deduction -> 71 damage
        expect(res.mitigatedDamage).toBe(71);
    });

    it("bypasses all armor and resistances when dealing TRUE_DAMAGE", () => {
        const res = CombatMitigationEngine.calculateDamage("TRUE_DAMAGE", baseAttacker, baseDefender);
        expect(res.mitigatedDamage).toBe(100);
        expect(res.armorDeduction).toBe(0);
        expect(res.resistanceDeduction).toBe(0);
    });
});