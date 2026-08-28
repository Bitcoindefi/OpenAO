/**
 * Combat Damage Mitigation & Armor Penetration Engine for OpenAO MMORPG.
 * Simulates hierarchical armor reduction (flat deduction + percentage penetration),
 * elemental resistance matrices, and unmitigated True Damage.
 */

export type DamageType = "PHYSICAL" | "MAGICAL_FIRE" | "MAGICAL_WATER" | "MAGICAL_EARTH" | "TRUE_DAMAGE";

export interface CombatAttackerStats {
    attackPower: number;
    flatArmorPenetration: number;
    percentArmorPenetration: number; // 0.0 to 1.0 (e.g. 0.30 = 30%)
    criticalMultiplier: number;
    isCriticalStrike?: boolean;
}

export interface CombatDefenderStats {
    armor: number;
    fireResistancePercent: number;  // 0.0 to 0.75 (max 75%)
    waterResistancePercent: number;
    earthResistancePercent: number;
    flatDamageReduction: number;
}

export interface DamageCalculationResult {
    rawDamage: number;
    mitigatedDamage: number;
    armorDeduction: number;
    resistanceDeduction: number;
    effectiveArmor: number;
    isCritical: boolean;
}

export class CombatMitigationEngine {
    private static readonly ARMOR_COEFFICIENT = 100; // Formula: armor / (armor + 100)
    private static readonly MAX_RESISTANCE_PERCENT = 0.75; // 75% hard cap

    /**
     * Calculates the effective armor after applying attacker flat and percentage penetration.
     */
    public static calculateEffectiveArmor(defenderArmor: number, attacker: CombatAttackerStats): number {
        const safeArmor = Math.max(0, defenderArmor);
        const afterFlat = Math.max(0, safeArmor - attacker.flatArmorPenetration);
        const percentPen = Math.min(1.0, Math.max(0.0, attacker.percentArmorPenetration));
        const finalArmor = afterFlat * (1.0 - percentPen);

        return Math.round(finalArmor * 100) / 100;
    }

    /**
     * Calculates total damage dealt after armor, elemental resistances, and critical modifiers.
     */
    public static calculateDamage(
        damageType: DamageType,
        attacker: CombatAttackerStats,
        defender: CombatDefenderStats
    ): DamageCalculationResult {
        let rawDamage = Math.max(1, attacker.attackPower);

        if (attacker.isCriticalStrike) {
            rawDamage = Math.round(rawDamage * Math.max(1.0, attacker.criticalMultiplier));
        }

        // True damage bypasses all armor and resistances completely
        if (damageType === "TRUE_DAMAGE") {
            return {
                rawDamage,
                mitigatedDamage: rawDamage,
                armorDeduction: 0,
                resistanceDeduction: 0,
                effectiveArmor: 0,
                isCritical: !!attacker.isCriticalStrike,
            };
        }

        let currentDamage = rawDamage;
        let armorDeduction = 0;
        let resistanceDeduction = 0;
        let effectiveArmor = 0;

        if (damageType === "PHYSICAL") {
            effectiveArmor = this.calculateEffectiveArmor(defender.armor, attacker);
            // Percentage damage reduction formula: Armor / (Armor + 100)
            const armorReductionFraction = effectiveArmor / (effectiveArmor + this.ARMOR_COEFFICIENT);
            armorDeduction = Math.round(currentDamage * armorReductionFraction);
            currentDamage = Math.max(1, currentDamage - armorDeduction);

            // Apply defender flat damage reduction
            const flatDeduction = Math.max(0, defender.flatDamageReduction);
            currentDamage = Math.max(1, currentDamage - flatDeduction);
        } else {
            // Magical elemental damage types
            let resPercent = 0.0;
            if (damageType === "MAGICAL_FIRE") resPercent = defender.fireResistancePercent;
            else if (damageType === "MAGICAL_WATER") resPercent = defender.waterResistancePercent;
            else if (damageType === "MAGICAL_EARTH") resPercent = defender.earthResistancePercent;

            const clampedRes = Math.min(this.MAX_RESISTANCE_PERCENT, Math.max(0.0, resPercent));
            resistanceDeduction = Math.round(currentDamage * clampedRes);
            currentDamage = Math.max(1, currentDamage - resistanceDeduction);
        }

        return {
            rawDamage,
            mitigatedDamage: Math.max(1, Math.round(currentDamage)),
            armorDeduction,
            resistanceDeduction,
            effectiveArmor,
            isCritical: !!attacker.isCriticalStrike,
        };
    }
}