/**
 * 2D Positional Combat & Backstab / Flanking Angle Engine for OpenAO MMORPG.
 * Simulates directional attack cones, backstab/flanking critical modifiers,
 * and frontal shield block mechanics with comprehensive angle normalization.
 */

export type CombatRelativeAngle = "BACKSTAB" | "FLANK" | "FRONTAL";

export interface CombatEntityPosition {
    x: number;
    y: number;
    facingAngleRad: number; // In radians
}

export interface PositionalDamageModifiers {
    sector: CombatRelativeAngle;
    damageMultiplier: number;
    criticalChanceBonusPercent: number;
    defenderParryBlockBonusPercent: number;
}

export class CombatPositioningEngine {
    /**
     * Normalizes an angle in radians into the [0, 2*PI) range.
     */
    public static normalizeAngle(rad: number): number {
        let angle = rad % (2 * Math.PI);
        if (angle < 0) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Resolves the relative positional sector of an attacker with respect to the defender's orientation.
     * Backstab sector: Rear 90-degree cone (angleDiff >= 135 deg).
     * Flank sector: Lateral 75-degree cones on left/right (60 <= angleDiff < 135 deg).
     * Frontal sector: Frontal 120-degree cone (angleDiff < 60 deg).
     */
    public static getRelativeAngle(
        attacker: CombatEntityPosition,
        defender: CombatEntityPosition
    ): CombatRelativeAngle {
        const dx = attacker.x - defender.x;
        const dy = attacker.y - defender.y;

        // Zero-distance guard for stacked identical coordinates
        if (dx === 0 && dy === 0) {
            return "FRONTAL";
        }

        // Angle of vector from defender to attacker
        const attackAngle = this.normalizeAngle(Math.atan2(dy, dx));
        const defenderFacing = this.normalizeAngle(defender.facingAngleRad);

        // Difference between attack vector and defender facing direction
        let diff = Math.abs(attackAngle - defenderFacing);
        if (diff > Math.PI) {
            diff = 2 * Math.PI - diff;
        }

        const diffDeg = (diff * 180) / Math.PI;

        if (diffDeg >= 135) {
            return "BACKSTAB";
        } else if (diffDeg >= 60) {
            return "FLANK";
        } else {
            return "FRONTAL";
        }
    }

    /**
     * Calculates the damage and critical strike modifiers based on positional combat sector.
     */
    public static computePositionalModifiers(
        attacker: CombatEntityPosition,
        defender: CombatEntityPosition
    ): PositionalDamageModifiers {
        const sector = this.getRelativeAngle(attacker, defender);

        switch (sector) {
            case "BACKSTAB":
                return {
                    sector: "BACKSTAB",
                    damageMultiplier: 1.40,
                    criticalChanceBonusPercent: 25.0,
                    defenderParryBlockBonusPercent: -100.0,
                };
            case "FLANK":
                return {
                    sector: "FLANK",
                    damageMultiplier: 1.15,
                    criticalChanceBonusPercent: 5.0,
                    defenderParryBlockBonusPercent: -25.0,
                };
            case "FRONTAL":
            default:
                return {
                    sector: "FRONTAL",
                    damageMultiplier: 1.0,
                    criticalChanceBonusPercent: 0.0,
                    defenderParryBlockBonusPercent: 15.0,
                };
        }
    }
}